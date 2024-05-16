const
    process = require('process'),
    out     = {},
    { readFile, writeFile } = require('fs/promises');

const {
    readFile: readSpreadsheet, booleano,
    addressToValue, getLista, getConsumo,
    getTabla, buscarV, normalizeStr,
    getVisible, getWSNames
    } = require('./utils/excelutils.js');

function processModel (model /*Object*/)
{
    let retorno = Array.isArray(model) ? [] : {};

    for (const campo in model)
    {
        const val = model[ campo ];

        if (!!val)
        {
            if (typeof val == 'string')
            {
                // Test de funcion
                if (/^[a-z]+\(/i.test( val ))
                {
                    retorno[ campo ] = eval( val );
                }
                else
                {
                    retorno[ campo ] = addressToValue( val );
                }
            }
            else
            {
                retorno[ campo ] = processModel( val );
            }
        }
    }

    return retorno;
}

function parseFecha (fecha, long = false)
{
    return [...fecha.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: long ? 'long' : 'short'
    })]; //.replace('.', '')].map((c, i) => i == 0 ? c.toUpperCase() : c).join('');
}
            
/**** Proceso *********************************************/
let g_filepath = './in.xlsx';

if (process.argv.length > 2)
{
    g_filepath = process.argv[2];
}

async function parseData (filepath)
{
    await readSpreadsheet( filepath );

    const modelo = {
        vacio: [],
        edificio: {
            nombre: "1.Intro!J19",
            ubicacion: {
                region: "1.Intro!H34",
                direccion: "1.Intro!F36",
                localidad: "1.Intro!T34",
                gps: "1.Intro!I36"
            },
            representante: {
                nombre: '1.Intro!F46',
                cargo: '1.Intro!Y46',
                telefono: '1.Intro!F47',
                email: '1.Intro!Q47'
            },
            actividad: {
                principal: "1.Intro!H20",
                secundaria: "1.Intro!J21",
            },
            horario_laboral: {
                lun_vie: [ "3.Services!K6", "3.Services!M6" ],
                sab: [ "3.Services!K7", "3.Services!M7" ],
                dom: [ "3.Services!K8", "3.Services!M8" ]
            },

            material: "2 Building!O22",
            pisos: "2 Building!O24",
            ventanas: "2 Building!O30",
            condicion: "2 Building!Y30",
            techo: "2 Building!Y26",
            material_techo:  "2 Building!O26",
            superficie: "2 Building!W6",

            comentarios: "2 Building!B50",

            indicador:  "2 Building!A1",

            consumos: [],
        },
        energeticos: {
            hay_varios: false,
            lpg: {
                years: `getTabla('Consumption!Q20:Q43',{
                    unique: true
                })`,
                consumos: `getConsumo('lpg')`,
                cost: {
                    anual: 'Consumption!E8',
                    xkwh: 'Consumption!E9',
                }
            },
            diesel: {
                years: `getTabla('Consumption!J20:J43',{
                    unique: true
                })`,
                consumos: `getConsumo('diesel')`,
                cost: {
                    anual: 'Consumption!D8',
                    xkwh: 'Consumption!D9',
                },
                equipment: {
                    rated: '4.Energy 1!J20',
                    model: '4.Energy 1!D20',
                    hours: '4.Energy 1!Z20',
                },
            },
            electricity: {
                years: `getTabla('Consumption!D20:D43',{
                    unique: true
                })`,
                consumos: `getConsumo('electricity')`,
                cost: {
                    anual: 'Consumption!C8',
                    xkwh: 'Consumption!C9',
                },
                indicator: 'Consumption!C10',
                balance: `getTabla('Balance!F4:H18', {
                    filter: fila => !!fila[7]
                })`,
            },
        },
        totales: {
            cons_kwh: `getLista([3, 4], "Consumption!C3:E5", {
                pack: val => !!val[ 1 ]
            })`,
            cons_tot: 'Consumption!F4',
            costo: `getLista([3, 8], "Consumption!C3:E8", {
                pack: val => !!val[ 1 ]
            })`,
        },
        usos: {
            light: {
                consumo: 'Lighting!R3',
                porcentaje: 'Lighting!R4',
                tabla: `getLista([
                    'C','E','G','I','M','R'
                ], 'Lighting!C8:R95', {
                    pack: val => val[0] != null
                })`,
            },
            split_ac: {
                is_present: 'Balance!G15',
                tabla: `getLista([
                    'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'Q', 'U'
                ], 'AC!C10:U95', {
                    pack: val => val[2]?.trim().toLowerCase() == 'ac'
                })`,
                qty: 0,
                consumo: 'AC!U4',
                porcentaje: 'AC!U6',
                cons_tot: 'AC!U3',
            },
            central_ac: {
                is_present: 'Balance!G16',
                tabla: `getLista([
                    'D', 'E', 'F', 'G', 'H', 'I', 'J', 'Q', 'U'
                ], 'AC!C10:U95', {
                    pack: val => val[1]?.trim().toLowerCase() == 'central ac'
                })`,
                hour_load: `getLista([
                    'N','Q'
                ], 'AC!C10:U95', {
                    pack: val => !!val[0]
                })`,
                outdoor_qty: 'AC!A2',
                handler_qty: 'AC!A2',
                hours_day: 'AC!A2',
                load: 'AC!A2',
                consumo: 'AC!U5',
                porcentaje: 'AC!U6',
                cons_tot: 'AC!U3',
            },
            refrigeration: {
                is_present: 'Balance!G13',
                tabla: `getLista([
                    'C','F','K','V'
                ], 'Refrigeration!C11:V95', {
                    pack: val => !!val[1]
                })`,
                consumo: 'Refrigeration!V3',
                porcentaje: 'Refrigeration!V7',
            },

            comp_air: {
                is_present: 'Balance!G6',
                consumo: 'Compr. Air!U3',
                porcentaje: 'Compr. Air!U4',
                devices: `getLista('C', 'Compr. Air!C9:C25', {
                    pack: val => !!val
                })`,
                usage: `getLista('D', 'Compr. Air!D9:D25', {
                    pack: val => !!val
                })`,
            },

            pumps: {
                is_present: 'Balance!G9',
                consumo: 'Pumps!W3',
                porcentaje: 'Pumps!W4',
                qty: 'Pumps!A2',
                have_vsd: 'Pumps!A2',
                potencias_qty: 'Pumps!A2',
                tabla: `getLista([
                    'G', 'I', 'K'
                ], 'Pumps!C8:S19', {
                    pack: val => !!val[0]
                })`
            },

            ventilation: {
                is_present: 'Balance!G8',
                data: `getLista({
                        uso: 'E', qty: 'G'
                    }, 'Ventilation!E8:E20', {
                    pack: val => val['qty'] > 0
                })`,
                usos: [],
                qty: 0,
                cons_kwh: 'Ventilation!U3',
                porcentaje: 'Ventilation!U4'
            },
            equipment: {
                is_present: 'Balance!G5',
                cons_kwh: 'Balance!G5',
                porcentaje: 'Balance!H5',
            },
        },
        medidas: {
            act_power: '14.Measurements!H8',
            rea_power: '14.Measurements!P8',
            pf: '14.Measurements!U8',
            is_present: '14.Measurements!H8',
        },
        pv: {
            is_present: 'PV assessment!H7',
        },
    };

    // debug
    // getWSNames();

    let resultado = processModel( modelo );

    ////////////////////////////
    // Procesamientos extra
    // ////////////
    //
    // Campos calculados de edificio
    resultado.edificio.indicador = resultado.totales.cons_tot / resultado.edificio.superficie;

    // ¿Hay varios consumos, más que electricidad?
    resultado.edificio.consumos = ['electricity', 'LPG', 'diesel'].filter(
        c => !!resultado.energeticos[ c.toLowerCase() ].consumos?.meses?.length
    );

    resultado.energeticos.hay_varios = resultado.edificio.consumos.filter(c => c != 'electricity').length > 0;

    // Ventilación
    resultado.usos.ventilation.usos.concat(
        resultado.usos.ventilation.data.map(d => d.uso)
    );
    resultado.usos.ventilation.qty = resultado.usos.ventilation.data.reduce(
        (acc, val) => acc + val.qty, 0
    );

    // Split AC
    resultado.usos.split_ac.qty = resultado.usos.split_ac?.tabla.reduce((acc, val) => acc + val[5], 0) ?? 0;
    resultado.usos.split_ac.porcentaje *= resultado.usos.split_ac.consumo / resultado.usos.split_ac.cons_tot;

    // Central AC
    const outs = resultado.usos.central_ac.tabla?.filter(v => v[2]?.toLowerCase().trim() == 'outdoor unit');
    resultado.usos.central_ac.out_models = outs.filter(v => !!v[3]).map(v => (v[3] + "").trim()).filter((v, i, self) => self.indexOf(v) === i) ?? [];
    resultado.usos.central_ac.outdoor_qty = outs.reduce((acc, val) => acc + val[4], 0);

    const hans = resultado.usos.central_ac.tabla?.filter(v => v[2]?.toLowerCase().trim() == 'air handler'); 
    resultado.usos.central_ac.han_models = hans.filter(v => !!v[3]).map(v => (v[3] + "").trim()).filter((v, i, self) => self.indexOf(v) === i) ?? [];
    resultado.usos.central_ac.handler_qty = hans.reduce((acc, val) => acc + val[4], 0);

    resultado.usos.central_ac.hours_day = resultado.usos.central_ac?.hour_load.reduce((acc, val) => val[0] > acc ? val[0] : acc, 0) ?? 0;
    resultado.usos.central_ac.load = resultado.usos.central_ac?.hour_load.reduce((acc, val) => val[1] > acc ? val[1] : acc, 0) ?? 0;
    resultado.usos.central_ac.porcentaje *= resultado.usos.central_ac.consumo / resultado.usos.central_ac.cons_tot;

    // Pumps
    resultado.usos.pumps.qty = resultado.usos.pumps?.tabla.reduce((acc, val) => acc + val[0], 0) ?? 0;
    resultado.usos.pumps.have_vsd = resultado.usos.pumps?.tabla.some(v => !!v[2]) ? 'do' : "don't" ?? "don't";
    resultado.usos.pumps.potencias_qty = resultado.usos.pumps?.tabla.reduce((acc, val) => {
        if (!(val[1] in acc))
        {
            acc[val[1]] = val[0];
        }
        else
        {
            acc[val[1]] += val[0];
        }

        return acc;
    }, {}) ?? {};

    const pot_qty = [];
    for (const key in resultado.usos.pumps.potencias_qty)
    {
        pot_qty.push(`${ resultado.usos.pumps.potencias_qty[key] } of ${ key } kW`);
    }
    resultado.usos.pumps.potencias_qty = pot_qty;

    // Armar datos de gráficas
    if (resultado.energeticos.electricity.consumos.meses)
    {
        resultado.energeticos.electricity.graf_consumos = {
            data: [{
                name: 'Energy (kWh)',
                data: resultado.energeticos.electricity.consumos.kwh.serie,
            }],
            config: {
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Energy (kWh)'
                    },
                    labels: {
                        format: '{value}',
                    },
                },
                xAxis: {
                    categories: resultado.energeticos.electricity.consumos.meses.map(d => parseFecha(new Date(d))),
                    labels: {
                        rotation: -45
                    },
                }
            }
        };
    }

    const outpath = filepath.replace('.xlsx', '.json');

    await writeFile(outpath, JSON.stringify(resultado, null, 2));

    console.log(`Fin (Archivo escrito en ${ outpath })`);

    return outpath;
};

if (require.main === module)
{
    parseData(g_filepath);
}
else
{
    module.exports = { parseData };
}

/**********************************************************/
