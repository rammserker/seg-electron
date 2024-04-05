const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron'),
    path = require('node:path'),
    utils = require(path.join(__dirname, 'js/file-utils.js')),
    { cleanTemplate } = require(path.join(__dirname, 'js/cleanTemplate.js')),
    { processProject } = require(path.join(__dirname, 'js/process-seg.js')),
    { parseData } = require(path.join(__dirname, 'js/data-parser-etapa2.js')),
    appVersion = 'v0.6';

// Paths comunes
const 
    buildpath   = path.join(__dirname, 'build'),
    tplspath    = path.join(__dirname, 'project'),
    tmppath     = path.join(__dirname, 'tmp');

function createWin ()
{
    const win = new BrowserWindow({
        width: 800, height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        // show: false
    });

    ipcMain.on('nuevo-proyecto', (evt, nombre) => {
        const proypath = path.join(buildpath, nombre);
    });

    // win.maximize();
    win.show();
    win.loadFile('index.html');
}

// Utilidades
async function handleExistsProyecto (evt, nombre)
{
    const proypath = path.join(buildpath, nombre);
    return utils.existsFile(proypath);
}

async function handleGetProyectos ()
{
    const directorios = (
        await utils.getFilesFromDir(buildpath)
    ).filter(d => d.isdir),
        retorno = [];

    for (const pry of directorios)
    {
        const name = pry.name,
            ctime = pry.ctime,
            dfpath = path.join(pry.path, 'relevamiento/relevamiento.xlsx'),
            xfpath = path.join(buildpath, `${ name }.docx`),
            proyecto = {
                name, ctime,
                df: null, xf: null
            };

        if (utils.existsFile(dfpath))
        {
            proyecto.df = await utils.stat(dfpath);
        }

        if (utils.existsFile(xfpath))
        {
            proyecto.xf = await utils.stat(xfpath);
        }

        retorno.push(proyecto);
    }

    return retorno;
}

async function handleOpenFileExplorer (evt, options)
{
    const opts = {},
        props = [ 'filters', 'buttonLabel', 'defaultPath' ];

    for (const prop of props)
    {
        if (prop in options)
        {
            opts[ prop ] = options[ prop ];
        }
    }

    if (!opts?.defaultPath)
    {
        opts.defaultPath = buildpath;
    }

    const files = await dialog.showOpenDialog(opts);

    if (files.canceled)
    {
        return false;
    }

    return files.filePaths[0];
}

// Acciones
async function handleNuevoProyecto (evt, nombre)
{
    const proypath = path.join(buildpath, nombre);

    let resultado = await utils.rmFile(proypath, true, true);
    resultado = resultado && (await utils.cpFile(tplspath, proypath, true));

    return {
        ok: resultado,
        msg: resultado ?
            `Se creó el proyecto "${ nombre }" con éxito`
            : `Hubo un problema al intentar crear el proyecto "${ nombre }"`
    };
}

async function handleCrearTemplate (evt, tplpath)
{
    const tplname = path.basename(tplpath, '.docx'),
        tmpl_docx = path.join(tmppath, tplname + '.docx');

    if (tmpl_docx !== tplpath)
    {
        // Hay que copiar el archivo
        await utils.cpFile(tplpath, tmpl_docx);
    }
    
    // Pasos:
    // 1) Limpiar directorios temporales:
    //      - tmp/docx
    //      - tmp/tables
    // 2) Limpiar directorio de template:
    //      - project/docx_tmp
    //      - project/template/tables
    // 3) Copiar archivo docx de template en tmp/docx
    // 4) Exraer tmp/docx/{template}.docx en el lugar
    // 5) Borrar tmp/docx/{template}.docx
    // 6) En la raíz, ejecutar `node cleanTemplate.js`
    // 7) Renombrar tmp/docx/word/document_clean.xml a document.xml
    // 8) Copiar el contenido de tmp/docx/ a project/docx_tmp
    // 9) Copiar tmp/docx/word/document.xml a project/template/index.tpl
    // 10) Copiar el contenido de tmp/tables a project/template/tables

    // Paso 1
    await utils.rmFile(path.join(tmppath, 'docx'), true, true);
    await utils.mkdir(path.join(tmppath, 'docx'));

    await utils.rmFile(path.join(tmppath, 'tables'), true, true);
    await utils.mkdir(path.join(tmppath, 'tables'));

    // Paso 2
    await utils.rmFile(path.join(tplspath, 'docx_tmp'), true, true);
    await utils.mkdir(path.join(tplspath, 'docx_tmp'));

    await utils.rmFile(path.join(tplspath, 'template/tables'), true, true);
    await utils.mkdir(path.join(tplspath, 'template/tables'));

    // Paso 3, 4 y 5
    console.log('Descomprimiendo', tmpl_docx);
    await utils.decompress(tmpl_docx, path.join(tmppath, 'docx'));

    // Paso 6
    console.log('Limpiando template');
    await cleanTemplate();

    // Paso 7
    await utils.mvFile(
        path.join(tmppath, 'docx/word/document_clean.xml'),
        path.join(tmppath, 'docx/word/document.xml')
    );
    
    // Paso 8
    // 8) Copiar el contenido de tmp/docx/ a project/docx_tmp
    await utils.cpFile(
        path.join(tmppath,  'docx'),
        path.join(tplspath, 'docx_tmp'),
        true
    );

    // Paso 9
    // 9) Copiar tmp/docx/word/document.xml a project/template/index.tpl
    await utils.cpFile(
        path.join(tmppath,  'docx/word/document.xml'),
        path.join(tplspath, 'template/index.tpl')
    );

    // Paso 10
    // 10) Copiar el contenido de tmp/tables a project/template/tables
    await utils.cpFile(
        path.join(tmppath,  'tables'),
        path.join(tplspath, 'template/tables'),
        true
    );
}

async function handleDataProyecto (evt, nombre, fpath)
{
    const ppath = path.join(buildpath, nombre),
        rpath = path.join(ppath, 'relevamiento/relevamiento.xlsx'),
        dpath = path.join(ppath, 'data/data.json');

    await utils.cpFile(fpath, rpath);

    const retorno = {
        ok: true,
        msg: `Se generaron los datos para el proyecto "${ nombre }"`
    };

    try
    {
        // await generar_datos(nombre);
        const json = await parseData(rpath);

        await utils.cpFile(json, dpath);
    }
    catch (e)
    {
        retorno.ok = false;
        retorno.msg = `Hubo un error al procesar el relevamiento de "${ nombre }".\n`;
        retorno.error = e;

        if (e.name = 'TypeError')
        {
            if (e.message.indexOf('filterButton') > -1)
            {
                retorno.msg += "\nSeguramente hay filtros presentes en la planilla. Quitarlos y volver a procesar.";
            }

            if (e.message.indexOf('La hoja') > -1)
            {
                retorno.msg += "\nEl formato del relevamiento es incorrecto para el modelo de datos configurado.";
            }

            retorno.msg += `\n${ e.message }`;

            await utils.rmFile(rpath, true, true);
        }
    }

    return retorno;
}

async function handleAbrirDirPry (evt, nombre)
{
    const ppath = path.join(buildpath, nombre);
    await shell.openPath(ppath);
}

async function handleBorrarProyecto (evt, nombre)
{
    const resultado = await utils.rmFile(path.join(buildpath, nombre), true, true);

    return {
        ok: resultado,
        msg: resultado ?
            `Proyecto "${ nombre }" borrado con éxito`
            : `Error al borrar el proyecto "${ nombre }"`,
    };
}

async function handleCompilarProyecto (evt, proyecto)
{
    const retorno = {
        ok: true,
        msg: `Se compiló el proyecto "${ proyecto }" con éxito.`
    };

    try
    {
        console.log('Compilar', proyecto);
        // Pasos:
        // 1) ppath = buildpath + proyecto
        // 2) Limpiar ppath/docx_tmp
        // 3) cp project/docx_tmp a ppath/docx_tmp
        // 4) node process-seg.js ppath
        // 5) mv ppath/document.cml ppath/docx_tmp/word/document.xml
        // 6) comprimir ppath/docx_tmp a ./transicional.zip
        // 7) mv ./transicional.zip a ppath.docx

        // 1) ppath = buildpath + proyecto
        const ppath = path.join(buildpath, proyecto);

        // 2) Limpiar ppath/docx_tmp
        const docx_tmp = path.join(ppath, 'docx_tmp');
        await utils.rmFile(docx_tmp, true, true);

        // 3) cp project/docx_tmp a ppath/docx_tmp
        const ptpl = path.join(tplspath, 'docx_tmp');
        await utils.cpFile(ptpl, docx_tmp, true);

        // 4) node process-seg.js ppath
        const dpath = path.join(ppath, 'data/data.json'),
            opath = path.join(ppath, 'document');

        await processProject(ppath, dpath, opath);

        // 5) mv ppath/document.xml ppath/docx_tmp/word/document.xml
        await utils.mvFile(
            path.join(ppath, 'document.xml'),
            path.join(docx_tmp, 'word/document.xml')
        );

        // 6) comprimir ppath/docx_tmp a ./transicional.zip
        const tzip =path.join(ppath, 'transicional.zip');
        await utils.compress(docx_tmp, tzip);

        // 7) mv ./transicional.zip a ppath.docx
        await utils.mvFile(tzip, path.join(buildpath, `${ proyecto }.docx`));
        console.log('FIN');
    }
    catch (e)
    {
        retorno.ok = false;
        retorno.msg = `Ocurrió un error compilando "${ proyecto }". Verifique los datos e imágenes.`;
        retorno.error = e;
    }

    return retorno;
}

app.whenReady().then(_ => {
    // Utilidades
    ipcMain.handle('utils:existsProyecto', handleExistsProyecto);
    ipcMain.handle('utils:getProyectos', handleGetProyectos);
    ipcMain.handle('utils:openFileExplorer', handleOpenFileExplorer);

    // Acciones
    ipcMain.handle('acciones:nuevoProyecto', handleNuevoProyecto);
    ipcMain.handle('acciones:compilarProyecto', handleCompilarProyecto);
    ipcMain.handle('acciones:crearTemplate', handleCrearTemplate);
    ipcMain.handle('acciones:dataProyecto', handleDataProyecto);
    ipcMain.handle('acciones:abrirDirPry', handleAbrirDirPry);
    ipcMain.handle('acciones:borrarProyecto', handleBorrarProyecto);

    createWin();

    app.on('activate', _ => {
        if (BrowserWindow.getAllWindows().length ===0)
        {
            createWin();
        }
    });
});

app.on('window-all-closed', _ => {
    if (process.platform !== 'darwin')
    {
        app.quit();
    }
});
