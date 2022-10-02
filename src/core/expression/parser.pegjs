{
    var Expression = require("./classes");
    function flatten(vars) {
      if(vars instanceof Array) {
        var r = "";
        for(var i = 0; i < vars.length; i++) {
          r += flatten(vars[i]);
        }
        return r;
      } else {
        return vars || ""
      };
    }
    function create_operator(name, lhs, rhs) {
      if(rhs != null) {
        return new Expression.Operator(name, lhs, rhs);
      } else {
        return new Expression.Operator(name, lhs);
      }
    }
    function gen_operator(left, others) {
      var r = left;
      for(var i = 0; i < others.length; i++) {
        var op = flatten(others[i][1]);
        var rh = others[i][3];
        r = create_operator(op, r, rh);
      }
      return r;
    }
}

start
  = expression

start_text
  = parts:text_part*
    { return new Expression.TextExpression(parts); }

text_part
  = "${" expr:expression "}{" sp format:[^\}]+ sp "}"
    { return { expression: expr, format: flatten(format) }; }
  / "${" expr:expression "}"
    { return { expression: expr }; }
  / str:(text_plain)+
    { return { string: str.join("") }; }

text_plain
  = str:[^$\\]+
    { return flatten(str); }
  / "\\" p:[$\\]
    { return flatten(p); }

expression
  = sp expr:level_expression sp
    { return expr; }

level_expression
  = expr:levelm0
    { return expr; }

logic_operators "operator" = "and" / "or"
compare_operators "operator" = ">=" / ">" / "<=" / "<" / "==" / "!=" / "in"
level1_operators "operator" = "+" / "-"
level2_operators "operator" = "*" / "/"
level3_operators "operator" = "^"
unary_operators "operator" = "-" / "+"

levelm0
  = "not" sp expr:levelm0
    { return create_operator("not", expr); }
  / left:level0 others:( sp logic_operators sp level0 )*
    { return gen_operator(left, others); }

level0
  = left:level1 others:( sp compare_operators sp level1 )*
    { return gen_operator(left, others); }

level1
  = left:level2 others:( sp level1_operators sp level2 )*
    { return gen_operator(left, others); }

level2
  = left:level3 others:( sp level2_operators sp level3 )*
    { return gen_operator(left, others); }

level3
  = left:level4 others:( sp level3_operators sp level4 )*
    { return gen_operator(left, others); }

level4
  = item
  / op:unary_operators sp expr:level4
    {
        return create_operator(flatten(op), expr);
    }

begin_bracket "\"(\"" = "("
end_bracket "\")\"" = ")"
comma "\",\'" = ","
dot "." = "."

bracket_expression
  = begin_bracket sp expr:levelm0 sp end_bracket
    { return expr; }

item
  = primitive
  / function_call
  / lambda_function
  / fieldaccess
  / variable
  / bracket_expression

fieldable
  = variable
  / bracket_expression

fieldaccess
  = expr:fieldable fields:(sp dot sp variable_name)+
    { return new Expression.FieldAccess(expr, fields.map(function(f) { return f[3]; })); }

funcitem
  = fieldaccess
  / variable
  / bracket_expression

funcname
  = name:variable_name names:("." variable_name)*
    { return [name].concat(names.map(x => x[1])); }

variable "variable"
  = name:variable_name { return new Expression.Variable(name); }

argitem
  = expr:level_expression
    { return [ expr ] }

argitems
  = expr:argitem sp comma sp other:argitems
    { return [ expr ].concat(other) }
  / expr:argitem
    { return [ expr ] }

argitem_list
  = begin_bracket sp source_args:argitems sp end_bracket
    {
      var args = [];
      for(var i = 0; i < source_args.length; i++) {
        if(source_args[i].length == 2) {
        } else {
          args.push(source_args[i][0]);
        }
      }
      return args;
    }
  / "(" sp ")"
    { return []; }

function_call
  = funcname:funcname sp arglist:argitem_list
    { return new Expression.FunctionCall(funcname, arglist); }

argnames
  = expr:variable_name sp comma sp other:argnames
    { return [ expr ].concat(other) }
  / expr:variable_name
    { return [ expr ] }

lambda_function
  = begin_bracket sp argNames:argnames sp end_bracket sp "=>" sp expr:expression
    { return new Expression.LambdaFunction(expr, argNames); }
  / argName:variable_name sp "=>" sp expr:expression
    { return new Expression.LambdaFunction(expr, [argName]); }

primitive "value"
  = floating_point
  / boolean
  / string

floating_point "floating point"
  = str:([+-]? [0-9]+ ("." [0-9]+)? ([eE] [+-]? [0-9]+)?)
    { return new Expression.NumberValue(parseFloat(flatten(str))); }

boolean "boolean"
  = "true"
    { return new Expression.BooleanValue(true); }
  / "false"
    { return new Expression.BooleanValue(false); }

string "string"
  = repr:("\"" [^"]* "\"")
    { var str = JSON.parse(flatten(repr)); return new Expression.StringValue(str); }

variable_name "name"
  = name:([a-zA-Z_][a-zA-Z0-9_]*) { return flatten(name); }
  / repr:("`" [^`]* "`")
    { return JSON.parse(flatten(repr).replace(/\`/g, "\"")); }

sp "whitespace"
  = [ \n]*