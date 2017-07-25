const orion = require('./OrionApi/orion.js');
const util = require('./utils/utils.js');
const fs = require('fs');

const OrionApi = orion();

const csvString = fs.readFileSync('Tasks_stage.csv', 'utf-8');
const csv = util.strToCsv(csvString);

let tasks = [];

let headers = csv[0];
for(var i = 1; i < csv.length; i++){
    let task = {}
    for(var j = 0; j < headers.length; j++){
        task[headers[j]] = csv[i][j];
    }
    tasks.push(task);
}

let tasksWithData = [];
let meow = true;

(function run(){
    console.log('processing: ' + tasks.length);
    let task = tasks.shift();
    OrionApi.getTask(task.taskID).then(function(taskData){
        tasksWithData.push(Object.assign(task, taskData));
        if(tasks.length > 0){
            run();
        } else {
            end();
        }
    });
})();
    
    
function end(){
    console.log('writing: ' + tasks.length);
    fs.writeFileSync('taskdata.json', JSON.stringify(tasksWithData, null, 4));
}



