module.exports = {
    extend: extend,
    findToken: findToken,
    strToCsv: strToCsv,
    csvToStr: csvToStr
}

function extend(oldObj, newObj){
    var result = {};
    for(var key in oldObj){
        result[key] = oldObj[key];
    }
    for(var key in newObj){
        result[key] = newObj[key];
    }
    return result;
}

function findToken(str){
    var tokenFinder = /<input.*?_token.*?value="(.*?)">/;
    var match = tokenFinder.exec(str);
    if(!match){
        return undefined;
    }
    return match[1];
}

function strToCsv(str){
    var csv = [];
    var rows = str.split('\n');
    for(var i = 0; i < rows.length; i++){
        var columns = rows[i].split(',');
        for(var j = 0; j < columns.length; j++){
            columns[j] = columns[j].trim();
        }
        if(columns.length > 1){
            csv.push(columns);
        }
    }
    return csv;
}

function csvToStr(csv){
    var rows = [];
    for(var i = 0; i < csv.length; i++){
        rows.push(csv[i].join(','));
    }
    str = rows.join('\n');
    return str;
}