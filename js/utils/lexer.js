EnumType = {
    STRING:'STRING',
    TEXT:'TEXT',
    EXPRESION:'EXPRESION',
    IDENTIFIER:'IDENTIFIER',
    FUNCTION: 'FUNCTION',
    OPERATOR: 'OPERATOR',
    END: 'END'
}

class Lexer
{
    constructor ()
    {
        this.pos    = 0;
        this.buflen = 0;
        this.buf    = null;
        this.file   = null;

        this.optable = {
            '.': 'PERIOD',
            '(': 'L_PAREN',
            ')': 'R_PAREN',
            '!': 'EXCLAMATION',
            '&': 'AMPERSAND',
            '|': 'PIPE',
            '<': 'L_ANG',
            '>': 'R_ANG',
            '=': 'EQUALS',

            'in': 'IN',
            'of': 'OF'
        };
    }

    input (buf, file = "")
    {
        this.pos    = 0;
        this.buf    = buf;
        this.buflen = buf.length;
        this.file   = file;
    }

    token ()
    {
        if (this.pos >= this.buflen) return null;

        let endpos = this.buf.indexOf('{{', this.pos);

        if (this.pos < endpos)
        {
            // Hay texto
            let tok = {
                type: EnumType.TEXT,
                pos: {
                    pos: this.pos,
                    file: this.file
                },
                value: this.buf.substring(this.pos, endpos)
            };

            this.pos = endpos;
            return tok;
        }
        else if (endpos > -1)
        {
            // Hay expresion
            // this.pos += 2; // Salteo los bigotes
            return this.expresion();
        }
        else
        {
            let tok = {
                type: EnumType.TEXT,
                pos: {
                    pos: this.pos,
                    file: this.file
                },
                value: this.buf.substring(this.pos)
            };

            this.pos = this.buflen;
            return tok;
        }
    }

    expresion ()
    {
        this.pos += 2;

        let posfin = this.buf.indexOf('}}', this.pos + 1);

        if (posfin === -1)
        {
            throw Error(`Expresión incompleta en ${ this.pos }`);
        }
        else
        {
            let tok = {
                type: EnumType.EXPRESION,
                pos: {
                    pos: this.pos - 2,
                    file: this.file
                },
                value: this.processExpresion(posfin)
            };

            this.pos = posfin + 2; // Salteo los bigotes finales
            return tok;
        }
    }

    processExpresion (posfin)
    {
        this.skipNoTokens();

        let expr = [], 
            c = this.buf[ this.pos ];

        // Test funcion o macro
        if (c == '@') 
        {
            let endpos = ++this.pos;

            while (endpos <= posfin && this.esAlphanum(this.buf[ endpos ])) endpos++;

            if (endpos == this.pos)
                throw Error(`Se esperaba un identificador de función en ${ this.pos }`);

            let value = this.buf.substring(this.pos, endpos),
                type = value == 'end' ? EnumType.END : EnumType.FUNCTION,
                tok = {
                    type,
                    pos: {
                        pos: this.pos,
                        file: this.file
                    },
                    value 
                };

            this.pos = endpos + 1;
            expr.push(tok);

            this.skipNoTokens();
        }

        while (this.pos < posfin)
        {
            c = this.buf[ this.pos ];

            let op = this.optable[ c ];

            if (op !== undefined)
            {
                expr.push({
                    type: EnumType.OPERATOR,
                    pos: {
                        ops: this.pos++,
                        file: this.file
                    },
                    value: op
                });
            }
            else
            {
                if (this.esAlpha(c))
                    expr.push(this.processIdentifier());
                else if (this.esDigit(c))
                    expr.push(this.processNumber());
                else if (c === '"')
                    expr.push(this.processString());
                else
                    throw Error(`Error de token en ${ this.pos }. Evaluando [${ this.buf.substring(this.pos - 30, this.pos + 30) }]( ${ c } )`);
            }

            this.skipNoTokens();
        }

        return expr;
    }

    processIdentifier ()
    {
        let posfin = this.pos + 1;

        while (posfin <= this.buf.length && this.esAlphanum( this.buf[posfin] )) posfin++;
        
        let value = this.buf.substring(this.pos, posfin),
            type = EnumType.IDENTIFIER;

        if (!!this.optable[ value ])
        {
            type = EnumType.OPERATOR;
            value = this.optable[ value ];
        }

        let tok = {
            type,
            pos: {
                pos: this.pos,
                file: this.file
            },
            value 
        };

        this.pos = posfin + 1;
        return tok;
    }

    processString ()
    {
        let posfin = this.buf.indexOf('"', this.pos + 1);

        if (posfin === -1)
        {
            throw Error(`String no cerrado en ${ this.pos }`);
        }
        else
        {
            let tok = {
                type: EnumType.STRING,
                pos: {
                    pos: this.pos,
                    file: this.file
                },
                value: this.buf.substring(this.pos + 1, posfin)
            };

            this.pos = posfin + 2;
            return tok;
        }
    }

    processNumber ()
    {
        let endpos = this.pos + 1;

        while (endpos < this.buf.length && this.esDigit(this.buf[ endpos ])) endpos++;

        let tok = {
            type: EnumType.NUMBER,
            pos: {
                pos: this.pos,
                file: this.file
            },
            value: this.buf.substring(this.pos, endpos)
        };

        this.pos = endpos;
        return tok;
    }

    esDigit (c)
    {
        return (c >= '0' && c <= '9') ||
            c === '.' || c === '-';
    }

    esAlpha (c)
    {
        return  (c >= 'a' && c <= 'z') ||
                (c >= 'A' && c <= 'Z') ||
                c === '_' || c === '$' || c === '-';
    }

    esAlphanum (c)
    {
        return  this.esAlpha(c) || this.esDigit(c);
    }

    skipNoTokens ()
    {
        while (this.pos < this.buflen)
        {
            let c = this.buf[ this.pos ];

            if (c == ' ' || c == '\t' || c == '\r' || c == '\n') this.pos++;
            else break;
        }
    }
}

module.exports = { Lexer, EnumType };
