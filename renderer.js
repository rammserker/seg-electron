/* 
 * Interacción con el DOM
 * Directo en el webview
 *
const info = document.querySelector('.info');
info.innerText = `Esta app usa Chrome (v${ versions.chrome() }), Node (v${ versions.node() }) y Electron (v${ versions.electron() })`;

async function prueba ()
{
    const resp = await window.versions.ping();
    console.log(resp);
}

prueba();
*/
// Utilidades
async function mprompt (msg)
{
    // Construír el prompt
    const tpl   = document.querySelector('template.prompt')
        el      = tpl.content.cloneNode(true).querySelector('dialog'),
        label   = el.querySelector('label'),
        input   = el.querySelector('label input'),
        form    = el.querySelector('form');

    label.prepend(document.createTextNode(msg));
    document.body.prepend(el);

    function destroyPrompt ()
    {
        el.close();
        el.remove();
    }

    setTimeout(_ => {
        console.log('Intentando hacer foco...');
        input.focus();
    }, 300);

    return new Promise ((resolve, reject) => {
        form.addEventListener('reset', evt => {
            evt.preventDefault();

            destroyPrompt();
            resolve(false);
        });

        form.addEventListener('submit', evt => {
            evt.preventDefault();

            const result = input.value;
            destroyPrompt();
            resolve(result);
        });
    });
}

// Acciones
const acciones = {
    crearTemplate: async function ()
    {
        const tplfile = await window.segUtils.openFileExplorer({
            buttonLabel: 'Seleccionar template',
            filters: [
                {
                    name: 'Plantilla MS Word',
                    extensions: [ 'docx' ]
                }
            ],
        });

        if (!tplfile)
        {
            return {
                ok: false,
                msg: 'Se canceló la creación de template',
            };
        }

        const resultado = await window.segActions.crearTemplate(tplfile);
        return resultado;
    },
    nuevoProyecto: async function ()
    {
        let prynombre = await mprompt('Introducir el nombre del proyecto');

        if (!prynombre)
        {
            return {
                ok: false,
                msg: 'Creación de nuevo proyecto cancelada'
            };
        }

        if (await window.segUtils.existsProyecto(prynombre))
        {
            if (!confirm(`Un proyecto con el nombre ${ prynombre } ya existe. Al crear un proyecto con el mismo nombre borrará el anterior. ¿Continuar?`))
            {
                return {
                    ok: false,
                    msg:  'Creación de nuevo proyecto cancelada'
                };
            }
        }

        const resultado = await window.segActions.nuevoProyecto(prynombre);

        return resultado;
    },
    dataProyecto: async function (nombre)
    {
        const archivo = await window.segUtils.openFileExplorer({
            buttonLabel: 'Seleccionar planilla',
            filters: [
                {
                    name: 'Planilla Excel',
                    extensions: [ 'xlsx' ]
                }
            ],
        });

        if (!archivo)
        {
            return {
                ok: false,
                msg: 'Se canceló el procesamiento de datos',
            };
        }

        const resultado = await window.segActions.dataProyecto(nombre, archivo);
        return resultado;
    },
    abrirDirPry: async function (nombre)
    {
        return window.segActions.abrirDirPry(nombre);
    },
    abrirDirProyectos: async function ()
    {
        return window.segActions.abrirDirPry('');
    },
    borrarProyecto: async function (nombre)
    {
        if (confirm(`¿Está seguro que quiere borrar el proyecto "${ nombre }"?`))
        {
            return window.segActions.borrarProyecto(nombre);
        }

        return {
            ok: false,
            msg: `Borrado de proyecto "${ nombre }" cancelado`
        };
    },
    compilarProyecto: async function (nombre)
    {
        return window.segActions.compilarProyecto(nombre);
    },
};

// Misceláneas
async function manageActions (evt)
{
    const target = evt.target;

        if (target.dataset.action)
    {
        const accion = target.dataset.action,
            args = JSON.parse(target.dataset?.args ?? '[]'),
            mods = target.dataset.mods?.split(' ') ?? [];

        if (mods.find(m => m == 'noawait'))
        {
            acciones[ accion ](...args);
            return;
        }

        window.document.body.classList.add('working');

        const result = await acciones[ accion ](...args);

        refreshProyectos();
        window.document.body.classList.remove('working');

        if (result?.msg)
        {
            const msg = (!result.ok ? 'Error: ' : '') + result.msg;
            alert(msg);
        }

        if (result?.error)
        {
            console.error(result.error);
        }
    }
}

async function refreshProyectos ()
{
    console.log('Refrescando proyectos');

    const main = document.querySelector('main');
    main.innerHTML = '';

    const proyectos = await window.segUtils.getProyectos(),
        tpl = document.querySelector('template.tplproject');

    for (const pry of proyectos)
    {
        const elem = tpl.content.cloneNode(true);

        // Título proyecto
        elem.querySelector('h2').textContent = pry.name;
        
        // Tiempo creación
        const ctimeel = elem.querySelector('.ctime time');

        ctimeel.setAttribute('datetime', pry.ctime.toISOString());
        ctimeel.textContent = pry.ctime.toLocaleDateString('es-UY', {
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'America/Montevideo'
        });

        // Datos agregados
        if (!!pry.df)
        {
            const dtimeel = elem.querySelector('.dtime time');

            dtimeel.setAttribute('datetime', pry.df.ctime.toISOString());
            dtimeel.textContent = pry.df.ctime.toLocaleDateString('es-UY', {
                hour: 'numeric',
                minute: 'numeric',
                timeZone: 'America/Montevideo'
            });
        }
        
        // Compilación
        if (!!pry.xf)
        {
            const xtimeel = elem.querySelector('.xtime time');

            xtimeel.setAttribute('datetime', pry.xf.ctime.toISOString());
            xtimeel.textContent = pry.xf.ctime.toLocaleDateString('es-UY', {
                hour: 'numeric',
                minute: 'numeric',
                timeZone: 'America/Montevideo'
            });
        }

        for (const action of elem.querySelectorAll('[data-action]'))
        {
            action.dataset.args = JSON.stringify([ pry.name ]);
        }

        main.append(elem);
    }
}

async function main ()
{
    document.body.addEventListener('click', manageActions);

    refreshProyectos();
}

main();
