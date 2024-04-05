const { Lexer, EnumType } = require('./lexer.js'),
    { readFile } = require('fs/promises');

class Parser
{
    constructor () {}

    async parseFile (path) // returns AST
    {
        const archivo = await readFile(path),
            contenido = await archivo.toString();

        console.log(`PARSER: parseando archivo ${ path }`);

        return this.parse(contenido, path);
    }

    parse (str, filename) // returns AST
    {
        const lexer = new Lexer(),
            ast = [];

        lexer.input(str, filename);

        let token = lexer.token();

        while (!!token)
        {
            if (token.type == EnumType.EXPRESION)
            {
                const exprTokens = token.value.map(tok => tok),
                    first = exprTokens.shift();

                if (first?.type == EnumType.FUNCTION)
                {
                    first.params = exprTokens;

                    // Verificar si es un bloque
                    if (this.isBloque(token))
                    {
                        // Buscar el limite del bloque
                        token = lexer.token();

                        let nivel = 1,
                            bStart = token?.pos.pos,
                            bEnd = bStart;

                        while (token && nivel > 0)
                        {
                            if (token.type == 'EXPRESION')
                            {
                                if (this.isBloque(token))
                                {
                                    nivel++;
                                }
                                else if (token.value[0]?.type == 'END')
                                {
                                    nivel--;

                                    if (nivel == 0) bEnd = token.pos.pos;
                                }
                            }

                            token = lexer.token();
                        }

                        if (nivel !== 0)
                        {
                            throw Error(`Expresion no cerrada en ${ token.pos.pos }`);
                        }

                        const blockstr = str.substring(bStart, bEnd);

                        first.block = this.parse(blockstr);
                    }
                    else
                    {
                        token = lexer.token();
                    }

                    ast.push(first);
                }
                else
                {
                    ast.push(first);
                    token = lexer.token();
                }
            }

            ast.push(token);

            token = lexer.token();
        }

        return ast;
    }

    isBloque (token)
    {
        let first = token.value[0],
            result = false;

        switch (first.value)
        {
            case 'foreach':
                result = token.value[2]?.value == 'IN';
                break;

            case 'tabla':
                result = token.value.length < 3;
                break;

            case 'if':
            case 'ifes':
            case 'some':
            case 'every':
            case 'tpl_enumtabla':
                result = true;
                break;
        }

        return result;
    }

    processExprToken (token)
    {
        let result = {
            type: 'unknown',
            value: token.value
        };

        switch (token.type)
        {
            case EnumType.FUNCTION:
                result.type = 'function';
                break;

            case EnumType.IDENTIFIER:
                result.type = 'identifier';
                break;

            case EnumType.STRING:
                result.type = 'string';
                break;
            case EnumType.OPERATOR:
                result.type = 'operator';
                break;
        }
    }

    evalExpr (tokens, context, reduce = true)
    {
        let str = '',
            first = tokens[0];

        if (first?.type == 'FUNCTION')
        {
            const funToken = tokens.shift(),
                funct = this.functions[ funToken.value ];

            str += `{{ ${ funToken.value }(${ this.evalExpr(tokens, context) })`; // funct(...this.evalExpr(tokens, context, false));
        }
        else
        {
            let result = tokens.map(token => {
                switch (token.type)
                {
                    case 'IDENTIFIER':
                    case 'STRING':
                        return token.value;
                        break;
                }
            });

            if (!reduce) return result;
            else str += result.join(',');
        }

        return str;
    }
}

module.exports = Parser;
