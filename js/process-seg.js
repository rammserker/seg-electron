const { readFile, writeFile, copyFile, access, readdir, rename } = require('fs/promises'),
    util = require('util'),
    path = require('node:path'),
    process = require('process'),
    Parser = require('./utils/parser.js'),
    imgsize = require('image-size'),
    xml2js = require('xml2js'),
    { deepCopy } = require('./utils/excelutils.js');
    // hce = require('highcharts-export-server');

// const exportChart = util.promisify(hce.export);

// Globales
const indices = [],
    imagenes = [],
    enum_imagenes = [],
    tablas = [],
    graficas = [];

let datosGlobal = null;

function printTokens (ast, level = '')
{
    let tok = ast.shift();

    while (tok)
    {
        console.log(level, tok.type == 'TEXT' ? `"${ tok.value.trim().substring(0, Math.min(tok.value.length, 20)) }${ tok.value.length > 20 ? '...' : '' }"` : tok.value, ':', tok.type, !!tok.block);

        if (tok.type == 'FUNCTION')
            console.log('(', tok.params.map(p => `"${p.value}": ${p.type}`).join(', '), ')');

        if (!!tok.block)
        {
            printTokens(tok.block, level + '>> ');
        }

        tok = ast.shift();
    }
}


function compileParam (param, context)
{
    let retorno = null;

    switch (param.type)
    {
        case EnumType.IDENTIFIER:
            const ctx = safeContext(context);
            retorno = ctx[ param.value ];
            break;

        case EnumType.OPERATOR:
            retorno = param;
            break;

        default:
            retorno = param.value;
            break;
    }

    if (!!retorno)
        console.log(`>>> NULL: ${ param.value } (pos ${ param.pos.pos } en ${ param.pos.file })`);

    return retorno;
}

function safeContext (context, tplname = '')
{
    return new Proxy(context, {
        get (obj, prop)
        {
            const parts = prop.split('.');

            return parts.reduce((acc, field) => {
                if (field in acc)
                {
                    return acc[ field ];
                }
                else if (acc !== null)
                {
                    console.warn(`${ tplname }: No existe el campo ${ prop } en el contexto`);
                    return null;
                }

                return acc;
            }, obj);
        }
    });
}

const graphsOpts = {
    pie: {
        chart: {
            type: 'pie',
            options3d: {
                enabled: true,
                alpha: 60,
                beta: 0
            }
        },
        title: {
            text: '',
            floating: true,
            margin: 0,
            style: {
                fontSize: '1.6rem',
                fontWeight: 'bold'
            }
        },
        credits: {
            enabled: false,
        },
        plotOptions: {
            pie: {
                depth: 35,
                dataLabels: {
                    enabled: true,
                    format: '{point.name}:<br>{point.y:,.0f} ({point.percentage:.1f} %)',
                    connectorColor: 'black',
                    useHTML: true,
                    filter: {
                        property: 'percentage',
                        operator: '>=',
                        value: 0
                    },
                    style: {
                        fontSize: '.8rem'
                    },
                    padding: 0
                }
            }
        },
        series: [],
        colors: [ "#3063bc", "#e76d19", "#959595", "#e9b900", "#468dcc", "#64a537", "#1a3a73", "#9a3d01" ],
    },
    column: {
        chart: {
            type: 'column'
        },
        title: {
            text: ''
        },
        credits: {
            enabled: false,
        },
        legend: {
            enabled: true,
        },
        plotOptions: {
            column: {
                stacking: 'normal'
            }
        },
        xAxis: {
            categories: [],
            labels: {
                rotation: -45
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: ' ',
            },
            labels: {
                format: '{value}',
            },
        },
        series: [],
        colors: [ "#3063bc", "#e76d19", "#959595", "#e9b900", "#468dcc", "#64a537", "#1a3a73", "#9a3d01" ],
    }
}

async function checkFile (path)
{
    try
    {
        await access(path);
        return true;
    }
    catch (err)
    {
        console.warn(`El archivo ${ path } no es accesible`, err);
        return false;
    }
}


/* MAIN ****************************************************/
let g_prjpath = process.argv[2] ?? 'build/test_prj',
    g_datapath= process.argv[3] ?? `${ g_prjpath }/data/data.json`,
    g_outfile = process.argv[4] ?? `${ g_prjpath }/document`;

async function processProject (prjpath, datapath, outfile)
// async function processProject (prjpath)
{
    const imgpath =  `${ prjpath }/images`,
        basepath= `${ prjpath }/template`,
        tplpath = `${ basepath }/index.tpl`;
    
    console.log(`>> Parseando ${ tplpath } con los datos ${ datapath }`);

    const functions = new Proxy({
        async tpl (path, data = datosGlobal)
        {
            path = basepath + '/' + path;

            if (path.indexOf('tpl') == -1)
            {
                path = `${ path }/index.tpl`;
            }

            const parser = new Parser(),
                ast = await parser.parseFile(path);

            return compile(ast, data, path);
        },

        if (condicion)
        {
            return !!condicion;
        },

        ifes (val1, val2, op = '==')
        {
            return eval(`${ val1 } ${ op } ${ val2 }`);
        },
        
        some ()
        {
            return [ ...arguments ].some(v => !!v)
        },

        every ()
        {
            return [ ...arguments ].every(v => !!v)
        },

        join (arr, sep = ' ', final, mapfn)
        {
            let result = '',
                arreglo = JSON.parse(JSON.stringify(!!mapfn ? functions[ mapfn ](arr) : arr));

            if (!!final)
            {
                if (arreglo.length < 3)
                {
                    result = arreglo.join(final);
                }
                else
                {
                    const last = arreglo.pop();
                    result = [ arreglo.join(sep), last ].join(final);
                }
            }
            else
            {
                result = arreglo.join(sep);
            }

            return result;
        },

        toupper (str)
        {
            return str.toUpperCase();
        },

        tolower (str)
        {
            return str?.toLowerCase() ?? '';
        },

        capitalize (str = '')
        {
            return [...str].map((c, i) => i == 0 ? c.toUpperCase() : c.toLowerCase()).join('');
        },

        decapitalize (str = '')
        {
            return [...str].map((c, i) => i == 0 ? c.toLowerCase() : c).join('');
        },

        index (nivel, titulo, ...extras)
        {
            // Uso un global HORRENDO
            let numero = indices.length + 1,
                result = {
                    title: `## <a id="tit${ numero }"></a> ${ numero } ${ [ titulo, ...extras ].join('') }`,
                    index: numero,
                    children: []
                };

            if (nivel == 1)
            {
                indices.push(result);
            }
            else
            {
                let obj = indices[ indices.length - 1 ],
                    index = [ obj.index ],
                    aux = nivel,
                    prefix = '###';

                // console.log(obj, index, aux, prefix);

                while (aux > 2)
                {
                    obj = obj.children[ obj.children.length - 1];
                    index.push( obj ? obj.index : 1 );
                    prefix += '#';
                    aux--;
                }

                numero = obj ? obj.children.length + 1 : 1;

                index.push(numero);

                levelNum = index.join('.');

                result = {
                    title:  `${ prefix } <a id="tit${ levelNum }"></a> ${ levelNum } ${ [ titulo, ...extras ].join('') }`,
                    index: numero,
                    children: []
                };

                obj.children.push(result);
            }

            return result.title;
        },

        async foreach (arreglo, tpl, sep = ' ', final)
        {
            tpl = basepath + '/' + tpl;

            if (tpl.indexOf('tpl') == -1)
            {
                tpl = `${ tpl }/index.tpl`;
            }

            const parser = new Parser();
                ast = await parser.parseFile(tpl),
                each = [];

            for (const val of arreglo)
            {
                const copia = JSON.parse(JSON.stringify(ast));
                each.push(await compile(copia, val, tpl));
            }

            let result = '';

            if (!!final)
            {
                if (each.length < 3)
                {
                    result = each.join(final);
                }
                else
                {
                    const last = each.pop();
                    result = [ each.join(sep), last ].join(final);
                }
            }
            else
            {
                result = each.join(sep);
            }

            return result;
        },

        ntabla (entrada, caption = '', hasHeader = false)
        {
            let retorno = '',
                arreglo = JSON.parse(JSON.stringify(entrada));

            if (arreglo?.length > 0)
            {
                let header = arreglo.shift();


                if (hasHeader)
                {
                    retorno += '**' + header.join('** | **') + "**\n";
                    retorno += header.map(h => h.replaceAll(/./g, '-')).join('|') + "\n";
                }
                else
                {
                    retorno += header.join('|') + "\n";
                }

                arreglo.forEach(r => retorno += r.join('|') + "\n");

                if (caption !== '')
                {
                    retorno += `Table: ${ caption }` + "\n";
                }

                /*
                retorno += `<table>
                ${ hasHeader ? `<thead><tr>${
                    header.reduce((acc, val) => {
                        acc += `<th>${ val }</th>`;
                        return acc;
                    }, '')
                }</tr></thead>` : '' }
                <tbody>
                    ${ arreglo.reduce((result, row) => {
                        result += `<tr>${ 
                            row.reduce((acc, val) => {
                                acc += `<td>${ val }</td>`;
                                return acc;
                            }, '')
                        }</tr>`;
                        return result;
                    }, '') }
                </tbody>
                ${ caption !== '' ? `<caption>${ caption }</caption>` : '' }
                </table>`;
                */
            }

            return retorno;
        },
        tabla (arreglo, caption = '', hasHeader = false)
        {
            const index = tablas.length + 1,
                tbl = {
                    index,
                    caption: `Tabla ${ index }${ caption !== '' ? ` - ${ caption }` : '' }`
                };

            tablas.push(tbl);

            return this.ntabla(arreglo, `${ tbl.caption }`, hasHeader);
            // return this.ntabla(arreglo, `<a id="tabla${ index }"></a>${ tbl.caption }`, hasHeader);
        },

        grafica (tipo, datos, caption = '', title = '', config = null)
        {
            // Colores: #3063bc, #e76d19, #959595, #e9b900, #468dcc, #64a537, #1a3a73, #9a3d01
            const index = graficas.length,
                image =  path.join(`graficas`,`grafica${ index }`);
                graph = {
                    index, tipo, caption, datos, title, config,
                    path: path.join(`${ imgpath }`,`${ image }.png`)
                };

            graficas.push(graph);
            
            return `{{ @docenumimagen graficas.gra${ index } }}`;
        },

        nimagen (path, caption = '', extension = 'png')
        {
            path = path.join(`${ imgpath }`,`${ path }.${ extension }`);

            let retorno = `![${ caption }](${ path })`;

            return retorno;
        },

        enumimagen (path, caption, width = 0, height = 0)
        {
            const index = enum_imagenes.length;

            enum_imagenes.push({
                path, width, height, caption
            });

            return `{{ @docenumimagen enum_imagenes.img${ index } }}`;
        },

        imagen (path, width = 0, height = 0)
        {
            const index = imagenes.length;

            imagenes.push({
                path, width, height
            });

            return `{{ @docimagen imagenes.img${ index } }}`;
        },

        async docenumimagen (imgdata)
        {
            return functions.tpl('components/image_enum.tpl', imgdata);
        },

        async docimagen (imgdata)
        {
            return functions.tpl('components/image.tpl', imgdata);
        },

        first (arr)
        {
            return arr[0];
        },

        last (arr)
        {
            return arr[arr.length - 1];
        },

        rest (arr, index = 0)
        {
            const copia = deepCopy(arr);

            copia.shift();

            return copia;
        },

        count (arr, filtro)
        {
            const aux = !!filtro ?
                arr?.filter(filtro) :
                arr;

            return aux?.length ?? 0;
        },

        // highest(arr)         -> Compara y devuelve valor de arr
        // highest(arr, 0)      -> Compara indice 0 de filas y devuelve el valor
        // highest(arr, 0, 1)   -> Campara indice 0 y devuelve indice 1
        highest (arr, compkey, valuekey, fn)
        {
            const hasCompKey = compkey !== undefined && compkey !== null,
                hasValueKey = valuekey !== undefined && valuekey !== null;

            let resind = -1,
                maxval = null,
                outval = null;

            for (let i = 0, l = arr.length; i < l; i++)
            {
                let val = arr[i],
                    out = val;

                if (hasCompKey)
                {
                    val = val[compkey];
                }

                if (maxval === null || val > maxval)
                {
                    maxval = val;

                    if (hasValueKey)
                    {
                        outval = arr[i][valuekey];
                    }
                    else
                    {
                        outval = val;
                    }
                }
            }

            if (!!fn)
            {
                outval = this[ fn ](outval);
            }

            return outval;
        },

        defaultText (str, defstr = ' - ')
        {
            return str ?? defstr;
        },

        comment (str)
        {
            // Hacer absolutamente nada
            return "";
        },

        dateFormat (datestr, textual = false)
        {
            let date = new Date(datestr),
                opts = {
                    timeZone: 'UTC'
                };

            if (textual)
                Object.assign(opts, {
                    month: 'long',
                    year: 'numeric',
                    day: 'numeric'
                });

            return date.toLocaleDateString('es-UY', opts);
        },

        monthFormat (datestr, format = 'long', item = "first")
        {
            if (typeof datestr == 'object')
            {
                if (item == 'last')
                {
                    datestr = functions.last(datestr);
                }
                else if (item == 'first')
                {
                    datestr = functions.first(datestr);
                }
                else 
                {
                    datestr = datestr[ item ];
                }
            }

            let date = new Date(datestr),
                str = date.toLocaleString('es-UY', {
                timeZone: 'UTC', year: 'numeric',
                month: format
            });

            return format == 'short' ? functions.capitalize(str.replace('.', '')) : str;
        },

        numerico (valor, mantisa = 0)
        {
            // Guards
            if (isNaN(valor))
            {
                console.log(`>>> @numerico: Se pasó un valor no numérico`, valor);
                valor = 0;
            }

            valor = valor ?? 0;
            valor = valor.toFixed(mantisa);
            
            let parts = valor.split('.');

            parts[0] = [...parts[0]].reverse().reduce((acc, val, ind) => {
                if (ind % 3 == 0)
                {
                    acc.push(val)
                }
                else
                {
                    acc[ acc.length - 1 ] = '' + val + acc[ acc.length - 1];
                }

                return acc;
            }, []).reverse().join(',').replace('-,', '-');

            return parts.join('.');
        },

        porcentaje (valor = 0, total = 0)
        {
            if (total > 0)
            {
                valor /= total;
            }

            valor = `${ (valor * 100).toFixed(1) }`;
            // valor = valor.replace('.', ',');
            
            return valor;
        },

        horaFormat ([ hora1, hora2 ])
        {
            let resultado = '';

            if ([hora1, hora2].some(v => v === null))
            {
                // No hay datos suficientes, se considera "cerrado"
                resultado = "remains inactive";
            }
            else
            {
                resultado = `from ${ hora1 > 9 ? hora1 : '0' + hora1 }:00 to ${ hora2 > 9 ? hora2 : '0' + hora2 }:00`;
            }

            return resultado;
        },

        sum (arr)
        {
            return this.numerico( arr.reduce((acc, val) => acc + val, 0) );
        },

        espar (num)
        {
            return num % 2 == 0;
        },

        esimpar (num)
        {
            return !functions.espar(num);
        },

        async tablacaption (caption)
        {
            const tbl_caption = {
                    index: tablas.length + 1,
                    caption
                };

            tablas.push(tbl_caption);

            return await functions.tpl('components/table_caption.tpl', tbl_caption);
        },

        async enumtabla (tplpath, matriz, caption, header = false)
        {
            const copia = deepCopy(matriz),
                tbl_data = {
                    head: {},
                    body: [],
                    caption,
                    index: tablas.length + 1,
                };

            tablas.push(caption);

            console.log('CAPTI', caption);

            if (header)
            {
                const head = copia.shift();

                head.forEach((cell, idx) => tbl_data.head[ `cell${ idx }` ] = cell);
            }

            copia.forEach((fila, fidx) => {
                tbl_data.body.push(fila.reduce((acc, val, idx) => {
                    acc[ `cell${ idx }` ] = val;
                    return acc;
                }, {
                    index: fidx,
                    [ functions.espar(fidx) ? 'espar' : 'esimpar' ]: 1,
                    [ functions.esimpar(fidx) ? 'espar' : 'esimpar' ]: 0
                }));
            });

            const row_str = await functions.tpl(tplpath, tbl_data);
                //cap_str = await functions.tablacaption(caption);

            return row_str; // + cap_str;
        }
    }, {
        get (obj, func)
        {
            return func in obj ? obj[ func ] : function ()
            {
                console.log(func, ...arguments);
            };
        }
    });

    async function compile (ast, context, tplname = '', debug = false)
    {
        let tok = ast.shift(),
            str = '';

        const ctx = safeContext(context, tplname);

        while (tok)
        {
            switch (tok.type)
            {
                case EnumType.IDENTIFIER:
                    str += ctx[ tok.value ]; // `var(${ tok.value })`;
                    break;

                case 'FUNCTION':
                    const params = tok.params.map(p => compileParam(p, context));

                    if (!!tok.block)
                    {
                        switch (tok.value)
                        {
                            case 'if':
                            case 'ifes':
                            case 'some':
                            case 'every':
                                if (functions[ tok.value ](...params))
                                {
                                    str += await compile(tok.block, context, tplname);
                                }
                                break;

                            case 'foreach':
                                const ident = tok.params[0].value,
                                    arreglo = params[2];

                                console.log('FOR', ident, arreglo, params);

                                for (const val of arreglo)
                                {
                                    const ctx = { [ ident ]: val },
                                        ast = JSON.parse(JSON.stringify(tok.block));

                                    str += await compile(ast, ctx, tplname);
                                }
                                break;

                            case 'tpl_enumtabla':
                                // TODO: implementar
                                console.log('Tabla ENUMTABLA', tok.block);
                                str += await compile(tok.block, context, tplname);
                                break;

                            case 'tabla':
                                const tbl = {
                                    index: tablas.length + 1,
                                    caption: params[0] ?? ''
                                },
                                    ctx = tbl.caption !== '' ?
                                    {
                                        caption: `Table ${ tbl.index } - ${ tbl.caption }`,
                                        ...context
                                    } : context;


                                str += await compile(tok.block, ctx, tplname);
                                tablas.push(tbl);
                                break;

                            default:
                                str += "\n{\n\n";
                                str += await compile(tok.block, context, tplname);
                                str += "\n\n}\n";
                                break;
                        }
                    }
                    else
                    {
                        str += await functions[ tok.value ](...params);// func(params);
                    }
                    break;

                default:
                    str += tok.value; // `var(${ tok.value })`;
                    break;
            }

            tok = ast.shift();
        }

        return str;
    }
   
    const parser = new Parser(),
        ast = await parser.parseFile(tplpath);

    const datafile = await readFile(datapath),
        datastr = await datafile.toString(),
        data = JSON.parse(datastr);

    datosGlobal = data;

    //printTokens(ast);
    console.log('>> Compilando...');
    const result = await compile(ast, data, tplpath);

    console.log(`>> Guardando archivo ${ outfile }.tpl`);
    await writeFile(`${ outfile }.tpl`, result);

    console.log('>> Procesando imágenes');

    const
        staticimgpath = `${ imgpath }/static`,
        staticimgs = await readdir(staticimgpath),
        tmpimagenes = [];

    for (let { path, width, height } of imagenes)
    {
        const
            filepath = staticimgs.find(i => i.split('.')[0] == path),
            imagenpath = `${ staticimgpath }/${ filepath ?? 'default.png' }`,
            metadata = await imgsize(imagenpath), //.metadata(),
            ratio = metadata.width / metadata.height;

        console.log('>>> IMGPATH:', imagenpath);

        if (width == 0 && height == 0)
        {
            // Basado en ratio, max(width, height) = 5.400.000
            if (ratio >= 1)
            {
                width = 5400000;
                height = ~~(width / ratio)
            }
            else
            {
                height = 5400000;
                width = ~~(height * ratio);
            }
        }
        else
        {
            width   = width == 0    ? ~~(height * ratio) : +width;
            height  = height == 0   ? ~~(width / ratio)  : +height;
        }

        if (width > 5400000)
        {
            width = 5400000;
            height = ~~(width / ratio);
        }

        const
            docPrId = 1000 + tmpimagenes.length,
            resimg = {
                width, height, docPrId,
                seq: 'Figure', 
                imgId: `rId${ docPrId }`,
                target: `image${ docPrId }.${ metadata.format }`
            };

        tmpimagenes.push(resimg);

        // Copiar archivo a template de docx
        await copyFile(imagenpath, `${ prjpath }/docx_tmp/word/media/${ resimg.target }`);
    }

    const tmpenumimg = [];

    for (let { path, width, height, caption } of enum_imagenes)
    {
        const
            filepath = staticimgs.find(i => i.split('.')[0] == path),
            imagenpath = `${ staticimgpath }/${ filepath ?? 'default.png' }`,
            // imagenpath = `${ staticimgpath }/${ staticimgs.find(i => i.split('.')[0] == path) ?? 'default.png' }`,
            metadata = await imgsize(imagenpath), // .metadata(),
            ratio = metadata.width / metadata.height;

        console.log('>>> ENUM_IMGPATH:', imagenpath);

        if (!filepath)
        {
            // Va imagen por defecto
            caption += `(Se esperaba img [${ path }])`;
        }

        if (width == 0 && height == 0)
        {
            // Basado en ratio, max(width, height) = 5.400.000
            if (ratio >= 1)
            {
                width = 5400000;
                height = ~~(width / ratio)
            }
            else
            {
                height = 5400000;
                width = ~~(height * ratio);
            }
        }
        else
        {
            width   = width == 0    ? ~~(height * ratio) : +width;
            height  = height == 0   ? ~~(width / ratio)  : +height;
        }

        const
            docPrId = 1500 + tmpenumimg.length,
            resimg = {
                caption, index: tmpenumimg.length + 1,
                imgProps: {
                    width, height, docPrId,
                    seq: 'Image', 
                    imgId: `rId${ docPrId }`,
                    target: `image${ docPrId }.${ metadata.format }`
                }
            };

        tmpenumimg.push(resimg);

        // Copiar archivo a template de docx
        await copyFile(imagenpath, `${ prjpath }/docx_tmp/word/media/${ resimg.imgProps.target }`);
    }
    // console.log('>> Procesando imágenes 33');

    console.log('>> Generando gráficas');

    const tmpgraficas = [];

    for (const grafica of graficas)
    {
        let options = JSON.parse(JSON.stringify(graphsOpts[ grafica.tipo ]));

        if (!options) throw Error(`No hay gráfica de tipo ${ grafica.tipo }`);

        switch (grafica.tipo)
        {
            case 'pie':
                options.title.text = grafica.title;
                options.series.push({
                    type: 'pie',
                    data: grafica.datos
                });
                break;

            case 'column':
                options.title.text = grafica.title;
                options.series = grafica.datos;
                options.legend.enabled = options.series.length > 1;
                break;
        }

        // Integrar las configuraciones
        Object.assign(options, grafica.config);

        await writeFile(grafica.path + '.json', JSON.stringify(options));
        console.log(`>>>>  Archivo guardado en ${ grafica.path }.json`);
    }

    // Ahora debo armar el batch para producir las gráficas
    const batchstr = graficas.map(g => `${ g.path }.json=${ g.path }`).join(';');
    // Y acá el horror: ejecución síncrona de un comando shell...

    console.log('Generando gráficas...'); // [', batchstr, ']');
    console.log(`highcharts-export-server --batch "${ batchstr }"`);
    const execSync = require('child_process').execSync;
    execSync(`highcharts-export-server --batch "${ batchstr }"`);
    console.log('Fin de generación de gráficas');

    for (const grafica of graficas)
    {
        try
        {
            metadata = await imgsize(grafica.path); // .metadata();
            
            let ratio = metadata.width / metadata.height,
                width = 0,
                height = 0;

            if (ratio >= 1)
            {
                width = 3960000;
                height = ~~(width / ratio)
            }
            else
            {
                height = 3960000;
                width = ~~(height * ratio);
            }

            const
                docPrId = 2000 + tmpgraficas.length,
                resimg = {
                    caption: grafica.caption,
                    index: tmpgraficas.length + 1,
                    imgProps: {
                        width, height, docPrId,
                        seq: 'Graph', 
                        imgId: `rId${ docPrId }`,
                        target: `graficas${ docPrId }.png`
                    }
                };

            tmpgraficas.push(resimg);

            // Copiar archivo a template de docx
            await copyFile(grafica.path, path.join(`${ prjpath }`,`docx_tmp/word/media/${ resimg.imgProps.target }`));
        }
        catch (err)
        {
            console.error(`>>>> Fallo al crear ${ grafica.path }`, err);
        }

        // hce.killPool();
    };

    const
        xmlparser = new xml2js.Parser(),
        xmlbuilder = new xml2js.Builder();

    // Agregar referencias a las imágenes
    const
        reffile = await readFile(path.join(`${ prjpath }`, `docx_tmp/word/_rels/document.xml.rels`)),
        refstr = await reffile.toString(),
        refxml = await xmlparser.parseStringPromise(refstr);

    console.log('TmpImages cant:', tmpimagenes.length);

    for (const img of tmpimagenes)
    {
        refxml.Relationships.Relationship.push({
            '$': {
                Id: `rId${ img.docPrId }`,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                Target: `media/${ img.target }`
            }
        });
    }

    console.log('EnumImages cant:', tmpenumimg.length);

    for (const img of tmpenumimg)
    {
        refxml.Relationships.Relationship.push({
            '$': {
                Id: `rId${ img.imgProps.docPrId }`,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                Target: `media/${ img.imgProps.target }`
            }
        });
    }

    console.log('TmpGraficas cant:', tmpgraficas.length);

    for (const img of tmpgraficas)
    {
        refxml.Relationships.Relationship.push({
            '$': {
                Id: `rId${ img.imgProps.docPrId }`,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                Target: `media/${ img.imgProps.target }`
            }
        });
    }

    await writeFile(path.join(prjpath, 'docx_tmp/word/_rels/document.xml.rels'), xmlbuilder.buildObject(refxml));

    const embed = {
        imagenes: {},
        graficas: {},
        enum_imagenes: {}
    };

    // Imágenes
    for (let i = 0, l = tmpimagenes.length; i < l; i++)
    {
        const {
            width, height, docPrId, seq, imgId
        } = tmpimagenes[ i ];

        embed.imagenes[ `img${ i }` ] = {
            width, height, docPrId, seq, imgId
        }
    }

    for (let i = 0, l = tmpenumimg.length; i < l; i++)
    {
        const obj = deepCopy(tmpenumimg[ i ]);

        embed.enum_imagenes[ `img${ i }` ] = obj;
    }

    for (let i = 0, l = tmpgraficas.length; i < l; i++)
    {
        const obj = deepCopy(tmpgraficas[ i ]);

        embed.graficas[ `gra${ i }` ] = obj;
    }

    // Generar archivo final
    const
        finalast = await parser.parseFile(`${ outfile }.tpl`),
        finalres = await compile(finalast, embed, tplpath);

    console.log(`>> Guardando archivo ${ outfile }.xml`);
    await writeFile(`${ outfile }.xml`, finalres);

    console.log('>>>> FIN <<<<<');
};

if (require.main === module)
{
    processProject(g_prjpath, g_datapath, g_outfile);
    // processProject();
}
else
{
    module.exports = { processProject };
}
