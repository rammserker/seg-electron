const
    ExcelJS = require('exceljs'),
    wb      = new ExcelJS.Workbook();

async function readFile (filepath /*String*/)
{
    await wb.xlsx.readFile(filepath);

    console.log(`Se ha cargado el archivo ${ filepath }`);
}

function normalizeStr (str = ''/*String*/)
{
    return str?.toLowerCase().trim() ?? '';
}

function deepCopy (obj /*Object*/)
{
    return JSON.parse(JSON.stringify(obj));
}

function colToNum (col /*String*/)
{
    let result = col.charCodeAt(0) - 64;

    return isNaN(col.charCodeAt(1)) ?
        result :
        result * 26 + col.charCodeAt(1) - 64;
}

function valor (celda)
{
    if (typeof celda == 'object' && celda !== null)
    {
        if ('result' in celda)
        {
            let resultado = celda.result;

            if (typeof resultado == 'object' && resultado !== null)
            {
                if ('error' in resultado)
                {
                    return null;
                }
                else
                {
                    return resultado;
                }
            }
            else
            {
                return resultado;
            }
        }
        else
        {
            return 'formula' in celda || 'sharedFormula' in celda ? null : celda;
        }
    }

    return celda;
}

function booleano (address/*String*/)
{
    const dato = addressToValue(address);

    return normalizeStr(dato) == 'si';
}

function avanzarHasta (arreglo /*Array*/, busqueda /*String*/, puntero = 0 /*Number*/)
{
    while (arreglo[ puntero ] === undefined || !valor(arreglo[ puntero ]) || normalizeStr(valor(arreglo[ puntero ])).indexOf(busqueda) < 0)
        puntero++;

    return puntero;
}

function getWSNames ()
{
    for (let i = 0, l = wb.worksheets.length; i < l; i++)
        console.log(`"${ wb.worksheets[ i ].name }"`, normalizeStr(wb.worksheets[ i ].name));
}

function getWorksheetByName (name /*String*/)
{
    let wsindex = 0;

    while (wsindex < wb.worksheets.length && normalizeStr(wb.worksheets[ wsindex ].name) != normalizeStr(name))
        wsindex++;

    const worksheet = wb.worksheets[ wsindex ];

    if (!worksheet)
        throw new URIError(`La hoja ${ name } no existe`);

    return worksheet
}

function addressToValue (address /*String*/)
{
    const parts = address.split('!');

    // Worksheet
    const wsname = parts[ 0 ],
        worksheet = getWorksheetByName(wsname);

    // Cell
    try
    {
        const cell = worksheet.getCell(parts[1]);

        return valor(cell.value);
    }
    catch (e)
    {
        throw new SyntaxError(`Dirección [${ address }]: Celda incorrecta (${ parts[1] })`);
    }
}

function addressToArea (address /*String*/)
{
    const parts = address.split('!');

    // Worksheet
    const wsname = parts[ 0 ],
        worksheet = getWorksheetByName(wsname);

    // Area
    if (!parts[ 1 ])
        throw new SyntaxError(`Dirección erronea: no existe la parte del área`);

    const limits = parts[ 1 ].match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);

    if (!limits)
        throw new SyntaxError(`Dirección [${ address }]: Dirección de área mal formada (${ parts[1] })`);

    const [ ,x1, y1, x2, y2 ] = limits;
    
    return {
        worksheet, rect: { x1, y1, x2, y2 }
    };
}

function makeAreaIterator (area /*Area*/, columns = false /*Bool*/, exclude = [] /*Array*/)
{
    const
        { worksheet, rect } = area,
        recordFn    = columns ? 'getColumn' : 'getRow';

    let init    = rect[ columns ? 'x1' : 'y1' ],
        end     = rect[ columns ? 'x2' : 'y2' ],
        nextIdx = init;

    if (columns)
    {
        init    = colToNum(init);
        end     = colToNum(end);
        exclude = exclude.map(colToNum);
        nextIdx = init;
    }

    end++;

    const areaIterator = {
        next ()
        {
            let record = worksheet[ recordFn ]( nextIdx ).values.map(v => valor(v));

            do
            {
                nextIdx++;
            }
            while (exclude.find(i => i == nextIdx));

            return {
                value: record, done: nextIdx > end
            };
        }
    };

    return areaIterator;
}

function getConsumo (energetico /*String*/)
{
    // Obtener columnas
    const 
        // consumos = getWorksheetByName('Consumption'),
        conf = ({
            // Req: Todos inician desde la fila 20 inclusive,
            // y abarcan hasta la fila 43 inclusive
            'electricity': {
                mes: 'C', ano: 'D', kwh: 'E', cost: 'F',
            },
            'diesel': {
                mes: 'I', ano: 'J', kwh: 'L', cost: 'M',
                unit: 'K',
            },
            'lpg': {
                mes: 'P', ano: 'Q', kwh: 'S', cost: 'T',
                unit: 'R',
            },
        })[ energetico ],
        meses = [
            'january', 'february', 'march', 'april', 'may',
            'june', 'july', 'august', 'september', 'october',
            'november', 'december'
        ],
        retorno = {};

    const crudos = getLista(
        {
            mes: conf.mes, ano: conf.ano,
            kwh: conf.kwh, cost: conf.cost,
            unit: conf.unit
        },
        `Consumption!${ conf.mes }20:${ conf.cost }43`,
        {
            pack: val => !!val[ 'mes' ] && !!val[ 'ano' ]
        });

    // console.log(crudos);
    if (crudos.length == 0) return null;

    // Convertir mes y año en Date
    retorno.meses = [];

    crudos.forEach(dato => {
        let mes = meses.findIndex(e => (new RegExp(e)).test(dato.mes.toLowerCase().trim()));

        retorno.meses.push(new Date(Date.UTC(dato.ano, mes, 1)));
    });

    // Consumo
    const kwh = crudos.map(d => d.kwh);
    
    if (!kwh.every(d => d == null))
    {
        retorno.kwh = {
            serie: [...kwh],
            avg: addressToValue(`Consumption!${ conf.kwh }44`),
            total: addressToValue(`Consumption!${ conf.kwh }45`),
        }
    }

    // Gastos
    const cost = crudos.map(d => d.cost);
    
    if (!cost.every(d => d == null))
    {
        retorno.cost = {
            serie: [...cost],
            avg: addressToValue(`Consumption!${ conf.cost }44`),
            total: addressToValue(`Consumption!${ conf.cost }45`),
        }
    }

    // Unidad
    const unit = crudos.map(d => d.unit);
    
    if (!unit.every(d => d == null))
    {
        retorno.unit = {
            serie: [...unit],
            avg: addressToValue(`Consumption!${ conf.unit }44`),
            total: addressToValue(`Consumption!${ conf.unit }45`),
        }
    }

    return retorno;
}

function getLista (model/*Number|String|Array|Object*/, address/*String*/, config = {}/*Object*/)
{
    const area = addressToArea(address);

    // Confirmar tipo de retorno //////////////////////////////
    //
    // Si modelo es Number o los items del Array/Object lo son
    //      >> Se recorre por columna y se arma por fila
    //
    // Si modelo es String o los item del Array/Object lo son
    //      >> Se recorre por fila y se arma por columnas
    ///////////////////////////////////////////////////////////
    let bycolumn = typeof model == 'number' || 
        typeof model == 'object' && typeof Object.values(model)[ 0 ] == 'number';

    const iter = makeAreaIterator(area, bycolumn, config.exclude ?? []);

    let record = iter.next(),
        result = [];

    while (!record.done)
    {
        const nuevo = deepCopy(model),
            obj = record.value;

        for (const campo in nuevo)
        {
            let dir = nuevo[ campo ];

            if (typeof dir != 'object')
            {
                dir = bycolumn ? dir : colToNum( dir );
                nuevo[ campo ] = valor(obj[ dir ]);
            }
            else
            {
                for (const subcampo in dir)
                {
                    dir[ subcampo ] = bycolumn ? dir[ subcampo ] : colToNum( dir[ subcampo ] );
                    dir[ subcampo ] = valor(obj[ dir[ subcampo ] ]);
                }
            }
        }

        if ('pack' in config)
        {
            if (config.pack(nuevo))
                result.push(nuevo);
        }
        else
        {
            if (!!nuevo)
                result.push(nuevo);
        }

        record = iter.next();
    }

    return result;
}

function getTabla (address/*String*/, config = {}/*Object*/)
{
    const
        area = addressToArea(address),
        iter = makeAreaIterator(area);

    let record = iter.next(),
        result = [];

    while (!record.done)
    {
        const fila = record.value,
            nueva = [];

        // Guards
        if (config.break?.( fila )) break;

        if (!(config.filter?.(fila) ?? true))
        {
            record = iter.next();
            continue;
        }

        for (let i = colToNum(area.rect.x1), l = colToNum(area.rect.x2); i <= l; i++)
        {
            nueva.push( fila[ i ] );
        }

        result.push(nueva);

        record = iter.next();
    }

    if (config?.unique)
    {
        let aux = new Set(result.filter(v => v != 0 && !!v).map(v => v[0]));
        result = [...aux];
    }

    return result;
}

function buscarV (address, check, field)
{
    const
        area = addressToArea(address),
        iter = makeAreaIterator(area);

    let record = iter.next();

    while (!record.done)
    {
        const fila = record.value;

        if (check(fila))
        {
            return fila[ colToNum(field) ];
        }

        record = iter.next();
    }

    return null;
}

function getVisible (filter /*val => Bool*/)
{
    const wss = !!filter ? wb.worksheets.filter(filter) : wb.worksheets;

    return wss.filter(ws => ws.state == 'visible');
}

exports.readFile = readFile;
exports.normalizeStr = normalizeStr;
exports.deepCopy = deepCopy;
exports.colToNum = colToNum;
exports.valor = valor;
exports.avanzarHasta = avanzarHasta;
exports.getWorksheetByName = getWorksheetByName;
exports.addressToValue = addressToValue;
exports.addressToArea = addressToArea;
exports.makeAreaIterator = makeAreaIterator;
exports.getLista = getLista;
exports.getConsumo = getConsumo;
exports.booleano = booleano;
exports.getTabla = getTabla;
exports.buscarV = buscarV;
exports.getVisible = getVisible;
exports.getWSNames = getWSNames;
