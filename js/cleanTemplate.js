const { readFile, writeFile } = require('fs/promises'),
    Parser = require('./utils/parser.js');

// const Parser = require('./utils/parser.js');
const cmd_tplpath = process.argv[2] ?? 'tmp/docx/word/document.xml';

function esbloque (str)
{
    return [
        '@if', '@ifes', '@tabla', '@enumtabla', '@enumimagen', '@imagen',
        '@end', '@grafica', '@tpl_enumtabla'
    ].some(f => str.indexOf(f) > -1);
}

// async function cleanTemplate (tplpath)
async function cleanTemplate (tplpath)
{
    const datafile = await readFile(tplpath);

    let datastr = await datafile.toString();
    // Llaves de apertura
    console.log('Cambiando llaves de apertura...');
    datastr = datastr.replaceAll('{{', '%%%%AP%%%%');
    datastr = datastr.replaceAll(/\{\<[\s\S]+?\>\{\s/g, '{{ ');
    datastr = datastr.replaceAll(/\{\<[\s\S]+?\>\{\</g, '{{<');
    datastr = datastr.replaceAll('%%%%AP%%%%', '{{');
    console.log('HECHO');

    console.log('Cambiando llaves de cierre...');
    datastr = datastr.replaceAll('}}', '%%%%CI%%%%');
    datastr = datastr.replaceAll(/\s\}\<[\s\S]+?\>\}/g, ' }}');
    datastr = datastr.replaceAll(/\>\}\<[\s\S]+?\>\}/g, '>}}');
    datastr = datastr.replaceAll( '%%%%CI%%%%', '}}');
    console.log('HECHO');

    console.log('Corrigiendo la interna de los tokens...');
    let puntero = -1,
        closing = 0,
        buffer = '',
        contador = 0;

    while ((puntero = datastr.indexOf('{{', puntero)) > -1)
    {
        contador++;
        puntero += 2;
        buffer += datastr.substring(closing, puntero);
        closing = datastr.indexOf('}}', puntero);

        const innerstr = datastr
            .substring(puntero, closing)
            .replaceAll(/<[\s\S]+?>/gi, '')
            .replaceAll(/[“”]/gi, '"')
            .replaceAll('&quot;', '"');

        console.log(puntero, innerstr, closing);

        buffer += innerstr;
    }

    buffer += datastr.substring(closing);
    console.log(`HECHO (Corregidos ${ contador } tokens)`);

    console.log('Corrigiendo problema con bloques...');
    puntero = -1;
    closing = 0;
    contador = 0;
    datastr = buffer;
    buffer = '';

    while ((puntero = datastr.indexOf('{{', puntero)) > -1)
    {
        // console.log('INI', puntero, closing);
        const llavefin = datastr.indexOf('}}', puntero),
            tok = datastr.substring(puntero + 2, llavefin),
            isblock = esbloque(tok);

        if (isblock)
        {
            // Es bloque. Retraso el puntero hasta el principio
            // del tag
            let found = false;

            while (!found)
            {
                puntero--;

                while (datastr[puntero] != '<')
                {
                    puntero--;
                }

                const test = datastr.substring(puntero, puntero + 4),
                    nchr = datastr[puntero + 4];

                found = test == '<w:p' && (nchr == ' ' || nchr == '>');
            }

            contador++;
        }

        buffer += datastr.substring(closing, puntero);
        buffer += ` {{${ tok }}} `;

        if (isblock)
        {
            closing = datastr.indexOf('</w:p>', llavefin) + 6;
        }
        else
        {
            closing = llavefin + 2;
        }

        puntero = closing;
    }

    buffer += datastr.substring(closing);
    console.log(`HECHO (Corregidas ${ contador } bloques)`);

    datastr = buffer;

    // await writeFile(tplpath.replace('.xml', '_pre.xml'), buffer);
    console.log('Creando templates de tablas...');
    contador = 0;
    datastr = buffer;
    buffer = '';
    puntero = -1;
    closing = 0;

    // Filtrar templates de tablas
    function getTablesTpls (frag, relpos)
    {
        let result = [];
        
        for (const tok of frag)
        {
            if (tok.type == 'FUNCTION')
            {
                if (tok.value == 'tpl_enumtabla')
                {
                    tok.pos.pos += relpos;
                    result.push(tok);
                }
                else if ('block' in tok)
                {
                    let auxpos = relpos + tok.pos.pos,
                        auxstr = datastr.substring(auxpos, auxpos + 500);

                    auxpos += auxstr.indexOf('}}') + 2;

                    // console.log('CTX', datastr.substring(auxpos -20, auxpos), '||', datastr.substring(auxpos, auxpos + 20));

                    result = result.concat(getTablesTpls(
                        tok.block, auxpos
                    ));
                }
            }
        }

        return result;
    }

    const parser = new Parser(),
        ast = await parser.parse(datastr),
        tpls = getTablesTpls(ast, 0);
    
    // ast.filter(t => t.type == 'FUNCTION' && t.value == 'tpl_enumtabla');
    await writeFile('prueba_ast.json', JSON.stringify(tpls, null, 4));

    for (const tpl of tpls)
    {
        let countllave = 0;
        puntero = tpl.pos.pos;

        console.log('TABLE >>> ', tpl.params[0].value); //, tpl.pos);
        // console.log('POS', datastr.substring(puntero - 20, puntero + 20));

        while (countllave < 2)
        {
            const chr = datastr[--puntero];

            // console.log('CHR', chr, puntero, countllave);

            if (puntero < 0)
            {
                process.exit();
            }

            if (chr == '{') countllave++;
        }

        // console.log('LLAVE ENCONTRADA');

        buffer += datastr.substring(closing, puntero);

        puntero = datastr.indexOf('}}', puntero) + 2;

        closing = datastr.indexOf('@end', puntero);

        countllave = 0;
        while (countllave < 2)
        {
            const chr = datastr[--closing];

            if (chr == '{') countllave++;
        }

        const tabla = datastr.substring(puntero, closing),
            tid = `tabla${ contador++ }`;

        ////// Crear el template
        let ptabla = -1,
            ctabla = 0,
            btabla = '';

        // Cabecera
        ptabla = tabla.indexOf('</w:tr>') + 7;
        btabla += tabla.substring(ctabla, ptabla) + "\n\n";
        ctabla = ptabla;

        // Cuerpo
        btabla += "{{ @foreach fila in body }}\n\n";
        ptabla = tabla.indexOf('</w:tr>', ctabla) + 7;
        let fila = tabla.substring(ctabla, ptabla),
            pfila = -1,
            cfila = 0,
            bfila = '',
            ccell = 0;

        function indexOfRegex(str, pat, start = 0)
        {
            const test = str.substring(start).search(pat);

            return test > -1 ? test + start : -1;
        }

        while ((pfila = indexOfRegex(fila, /<w:t[\s>]/g, cfila)) > -1)
        {
            pfila += fila.substring(pfila).indexOf('>') + 1;
            // console.log('FIL', fila.length, cfila, pfila);
            bfila += fila.substring(cfila, pfila);
            cfila = fila.indexOf('</w:t>', pfila);

            let cellstr = `fila.cell${ ccell++ }`;

            // Procesar contenido de celda
            const celda = fila.substring(pfila, cfila);

            if (celda.indexOf('{{') > -1 && celda.toLowerCase().indexOf('@apply') > -1)
            {
                const cellast = (await parser.parse(celda)).filter(t => t.type == 'FUNCTION');

                const parts = [`@${ cellast[0].params[0].value } ${ cellstr }`];

                cellast[0].params.filter((v, i) => i > 0).forEach(t => {
                    parts.push(t.type == 'STRING' ? `"${ t.value }"` : t.value);
                });

                cellstr = parts.join(' ');

                // console.log('CELDA', 'hay apply', cellast, cellast[0].params);
            }
            // console.log('CELDA', celda);
            bfila += `{{ ${ cellstr } }}`;

            pfila = cfila;
        }

        bfila += fila.substring(cfila);

        btabla += bfila + "\n\n";

        // Cierre
        btabla += "{{ @end }}\n\n</w:tbl>";

        // Caption
        ctabla = tabla.indexOf('</w:tbl>') + 8;
        
        let caption = tabla.substring(ctabla),
            pcap = -1,
            ccap = 0,
            bcap = '';

        /*
        pcap = caption.indexOf('ARABIC');
        pcap = caption.indexOf('<w:t>', pcap) + 5;

        bcap += caption.substring(ccap, pcap);
        bcap += ` {{ index }} `;

        ccap = caption.indexOf('</w:t>', pcap);
        pcap = caption.indexOf('<w:t>', ccap) + 5;
        bcap += caption.substring(ccap, pcap);
        bcap += `. {{ caption }} `;

        ccap = caption.indexOf('</w:t>', pcap);
        bcap += caption.substring(ccap);
        */

        // btabla += bcap; 
        btabla += caption; 

        await writeFile(`tmp/tables/${ tid }.tpl`, btabla);
        // await writeFile(`tmp/tables/${ tid }.tpl`, tabla);

        closing = datastr.indexOf('}}', closing) + 2;

        const params = tpl.params.filter((p, i) => i > 0).map(p => p.value);
        buffer += `{{ @enumtabla "tables/${ tid }.tpl" ${ params[0] } "${ params[1] }" }}`;
    }

    buffer += datastr.substring(closing);
    datastr = buffer;

    console.log(`HECHO (Creados ${ contador } templates de tablas)`);

    const final = await writeFile(tplpath.replace('.xml', '_clean.xml'), datastr);
    console.log('--- FIN ----');

    return final;
}

// Si es llamado directamente...
if (require.main === module)
{
    console.log('Llamado directamente');
    cleanTemplate(cmd_tplpath);
}
else
{
    console.log('Requerido cómo módulo');
    module.exports = { cleanTemplate };
}
