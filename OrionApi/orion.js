const request = require('request');
const mysql = require('mysql');
const util = require('../utils/utils.js');

const config = require('../config.js');

const defaults = {
    user: config.ORION_USER,
    pass: config.ORION_PASSWORD,
    db_name: config.ORION_DB_NAME,
    db_host: config.ORION_DB_HOST,
    db_user: config.ORION_DB_USER,
    db_pass: config.ORION_DB_PASSWORD,
    orion_base: config.ORION_HOST
};


module.exports = function(conf){
    var mod = {};
    mod.conf = util.extend(defaults, conf);
    mod.getLoginSession = getLoginSession;
    mod.createDevice = createDevice;
    mod.destroyDevice = destroyDevice;
    mod.setDeviceGroup = setDeviceGroup;
    mod.createUser = createUser;
    mod.getTask = getTask;

    return mod;
};

function getLoginSession(user, pass, callback){

    if(this.loginSession && user == this.conf.user && pass == this.conf.pass){
        callback(this.loginSession);
        return;
    }
    var localThis = this;
    var login = request.defaults({jar:true});
    login.get(localThis.conf.orion_base + '/auth/login', function (err, res, body){
        if(err){
            console.log(err);
            return;
        }
        var tokenFinder = /<input.*?_token.*?value="(.*?)">/;
        var match = tokenFinder.exec(body);
        localThis._token = match[1];

        login.post(localThis.conf.orion_base + '/auth/login', {
            form: {
                username: localThis.conf.user,
                password: localThis.conf.pass,
                _token: match[1]
            }
        }, function(loginErr, loginRes, loginBody){
            localThis.loginSession = login;
            callback(login);    
        });
    });
}

function createDevice(device, callback){
    var localThis = this;
    localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
        session.post(localThis.conf.orion_base + '/devices/create', {
            form: {
                _token: localThis._token,
                type: device.type,
                serial: device.serial,
                esn: device.esn,
                manufacturer: device.manufacturer,
                group: device.group,
                active: device.active
            }
        }, function(err, res, body){
            console.log('Device Created.');
            //check table
            // var db = mysql.createConnection({
            //     host     : localThis.conf.db_host,
            //     user     : localThis.conf.db_user,
            //     password : localThis.conf.db_pass,
            //     database : localThis.conf.db_name
            // });
            // db.query('select id from devices where serial = ?', [device.serial], function(err, results, fields){
            //     db.end();
            //     callback(results[0].id);
            // });
            callback(-1);
        });
    });
}

function destroyDevice(id, callback){
    var localThis = this;
    localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
        session.del(localThis.conf.orion_base + '/devices/' + id + '/destroy', function(err, res, body){
            callback(err);
        });
    });
}

function setDeviceGroup(opts, callback){
    var localThis = this;
    localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
        session({
            method: 'PUT',
            uri: localThis.conf.orion_base + '/devices/' + opts.id + '/tag', 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            },
            form:'namespace=group%3Aconfig&tags=' + opts.group
        }, function(err, res,body){
            callback(err);
        });
    });
}

function createUser(user, callback){
    var localThis = this;
    
    localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
        getDriverDefaults(localThis, function(driverDefaults){
            session.post(localThis.conf.orion_base + '/users', {
                form: {
                    _token: localThis._token,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    email: user.email,
                    external_id: user.external_id,
                    password: user.password,
                    password_confirmation: user.password_confirmation,
                    account_status: user.account_status,
                    role_id: user.role_id,

                    //Driver Specific fields not implemented
                    location_terminal_id: driverDefaults.location_terminal_id,
                    location_carrier_id: driverDefaults.location_carrier_id,
                    hours_of_service_ruleset: 'us_70hr_property',
                    regional_ruleset: '',
                    certifications: '',
                    phone_number: '',
                    fax: '',
                    drivers_license_number: '',
                    drivers_license_state: ''
                }
            }, function(err, res, body){
                console.log(res.statusCode);
                if(err){
                    callback(err);
                    return;
                }
                callback();
            });
        });
    });
}

//private
function getDriverDefaults(localThis, cb){
    cb({
        location_terminal_id: '3750193083701',
        location_carrier_id:  '3750194286301'
    });
    return;

    //Rest is not used yet;
    if(localThis.driverDefaults){
        cb(localThis.driverDefaults);
        return;
    }
    localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
        session.get(localThis.conf.orion_base + '/users/create', function(err,res,body){
            if(err){
                console.log(err);
                return;
            }
            var selectLocation = /<select.*?id="location_terminal_id/;
            var selectCarrier  = /<select.*?id="location_carrier_id/;
            var optionRegex = /<option.*?value="(.*?)".*>/g;

            localThis.driverDefaults = {};

            var location = selectLocation.exec(body);
            var carrier = selectCarrier.exec(body);
            var option = optionRegex.exec(body);
            while(option.index < location.index || option.index < carrier.index){
                
                if(option.index >= location.index){
                    localThis.driverDefaults.location_terminal_id = option[1];
                }
                if(option.index >= carrier.index){
                    localThis.driverDefaults.location_carrier_id = option[1];
                }
                option = optionRegex.exec(body);
            }
            
            cb(localThis.driverDefaults);
        });
    });
}

async function getTask(taskID){
    let localThis = this;

    const res = await new Promise(function(resolve, reject){
         localThis.getLoginSession(localThis.conf.user, localThis.conf.password, function(session){
            session.get(localThis.conf.orion_base + '/workflow/tasks/' + taskID, function(err,res,body){
                if(err){
                    console.log(err);
                    reject(err);
                    return err;
                }

                let idRegex = /<textarea.*?id="(.*?)".*?>(.*?)<\/textarea>/gm;
                
                let formIds = [
                    'form_definition',
                    'external_data',
                    'form_data'
                ];

                let taskData = {
                    ID: taskID
                };

                let match;
                while(match = idRegex.exec(body)){
                    if(formIds.indexOf(match[1]) > -1 && match[2].length > 0){
                        taskData[match[1]] = JSON.parse(match[2]);
                    }
                }

                resolve(taskData);
                return taskData;

            });
        });
    });

   return res;
}