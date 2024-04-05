const fs = require('fs/promises'),
    { existsSync } = require('fs'),
    path = require('path'),
    util = require('util'),
    exec = util.promisify(require('child_process').exec),
    azip = require('adm-zip'),
    jzip = require('jszip'),
    dzip = require('decompress');

function existsFile (path)
{
    return existsSync(path);
}

async function rmFile (path, recursive = false, force = false)
{
    console.log('Borrando', path);
    const result = await fs.rm(path, {
        force, recursive
    });

    return result === undefined;
}

async function cpFile (srcpath, destpath, recursive = false)
{
    console.log('Copiando', srcpath, destpath);
    const result = await fs.cp(srcpath, destpath, {
        recursive
    });

    return result == undefined;
}

async function mvFile (oldpath, newpath)
{
    return fs.rename(oldpath, newpath);
}

async function openFileExplorer (window, options = {})
{
    // Si o si se debe pasar el objeto window
    const FILEINPUT_ID = 'seg-input-select-file',
        doc = window.document;

    if (!!doc.getElementById(FILEINPUT_ID))
    {
        doc.getElementById(FILEINPUT_ID).remove();
    }

    let inp = doc.createElement('input');

    inp.type = 'file';
    inp.id = FILEINPUT_ID;
    inp.style = 'display: none';

    doc.body.append(inp);

    if (!options || typeof(options) != 'object' || Array.isArray(options))
    {
        throw 'options debe ser un objeto';
        return;
    }

    if ('workingdir' in options)
    {
        inp.setAttribute('nwworkingdir', options.workingdir);
    }

    if ('accept' in options)
    {
        inp.setAttribute('accept', options.accept);
    }

    const promesa = new Promise(function (resolve, reject)
    {
        inp.addEventListener('change', function (evt)
        {
            evt.target.remove();
            resolve(evt.target.files[0]);
        });

        window.document.body.addEventListener('focus', evt => console.log('FOCO', evt));

        inp.click();
    });

    return promesa;
}

async function openFile (path)
{
    let opencmd = 'xdg-open';

    switch (process.platform)
    {
        case 'darwin':
            opencmd = 'open';
            break;

        case 'win32':
        case 'win64':
            opencmd = 'start';
            break;
    }

    if (!existsFile(path))
    {
        alert(`No existe ningún archivo en "${ path }"`);
    }

    await exec(`${ opencmd } "${ path }"`);
}

function sortByTime (files, asc = false)
{
    // Retorno un nuevo array conteniendo los archivos
    // manteniendo la inmutabilidad
    return [...files].sort((a, b) => asc ?
        a.ctime - b.ctime :
        b.ctime - a.ctime
    );
}

async function mkdir (dirpath)
{
    const result = await fs.mkdir(dirpath, { recursive: true });
    
    return result === undefined;
}

async function stat (fpath)
{
    const datos = await fs.stat(fpath),
        nombre = path.basename(fpath);

    return  {
        name: nombre,
        path: fpath,
        isdir: datos.isDirectory(),
        ctime: new Date(datos.birthtime.getTime())
    };
}

async function getFilesFromDir (dirpath, sort = sortByTime, asc = false)
{
    const refs = await fs.readdir(dirpath),
        files = [];

    for (const file of refs)
    {
        const filepath = path.join(dirpath, file),
            stats = await stat(filepath);

        files.push(stats);
    }

    return sort(files, asc);
}

async function compress (inpath, outpath)
{
    const zip = new azip();
    zip.addLocalFolder(inpath);

    return await zip.writeZip(outpath);
}

async function decompress (inpath, outpath, overwrite = true)
{
    return dzip(inpath, outpath);
}

module.exports = {
    existsFile,
    openFileExplorer,
    rmFile,
    cpFile,
    mvFile,
    openFile,
    sortByTime,
    mkdir,
    getFilesFromDir,
    compress,
    decompress,
    stat,
}
