const fs = require('fs')
const path = require('path')
var os = require('os');

require('dotenv').config();
const crypto = require('crypto');
const AppMessage = require('../../server/util/AppMessage.js');

// const authenticatedConn = {};
// const unvalidatedConn = {};
// const extReconnInt = {};
// var recieve;

// get current host's interface IP
const getIp = function(){
    var ifaces = os.networkInterfaces();
    let returnIpAddress = '';
    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
            }
            if(ifname === process.env.NODE_INTF_NAME){
                if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                returnIpAddress = iface.address;
                // console.log(ifname + ':' + alias, iface.address);
                } else {
                // this interface has only one ipv4 adress
                returnIpAddress = iface.address;
                // console.log(ifname, iface.address);
                }
            }
            ++alias;
        });
    });

    return returnIpAddress
}
var selfIP = getIp();

const pakDetails = {
    "AI_Enabled": false,
    "VI_Enabled": false,
    "WI_Enabled": false,
    "DBI_Enabled": false,
    "pakCode":"MCP_MAMQ_0_0_1",
    "Name":"Manti-core Messenger(ActiveMQ) Package",
    "Description": "This is a module used for distributed Manti-core messaging setup.",
    "WebContext": "messenger-amq",
    "AppName": "messenger-amq"
}

const decryptContent = function(content){
    let contentDecrypted = "{}";
    try{
        let mykey = crypto.createDecipher('aes-128-cbc', process.env.DATA_ENCRYPT_SECRET);
        let contentDecrypted = mykey.update(content, 'hex', 'utf8')
        contentDecrypted += mykey.final('utf8');
        return contentDecrypted;
    }catch(err){
        console.log(err);
        return contentDecrypted;
    }
    
};

//function to encrypt content
const encryptContent = function(content){
    let mykey = crypto.createCipher('aes-128-cbc', process.env.DATA_ENCRYPT_SECRET);
    let contentEncrypted = mykey.update(content, 'utf8', 'hex');
    contentEncrypted += mykey.final('hex');

    return contentEncrypted;
};

const messageDestination = "manticore.broadcast";
const messageDestinationType = "topic";

const init = function(dbMgr, svcMgr, webMgr, appMessenger){
    PakManager.dbMgr = dbMgr;
    PakManager.svcMgr = svcMgr;
    PakManager.webMgr = webMgr;

    let recieve = appMessenger.recieverHandler;
    let allAccessObj = { appresources: [ '*' ], dbresources: ['*'] };
    svcMgr.ServiceManager.callOperation('activeMQConnector', 'destination', 'registerToDestination',
    {
        'ipAddress':"192.168.1.183",
        'port':61613,
        'type':messageDestinationType,
        'destination':messageDestination,
        'username':'admin',
        'password':'admin',
        'handler':function(message){
            let decryptedMessage = decryptContent(message);
            messageObj = JSON.parse(decryptedMessage);
            // if(typeof messageObj.source !== 'undefined'
            //         && messageObj.source !== selfIP){

                recieve(decryptedMessage);

            // }
        }
    },function(msg){console.log(msg);},allAccessObj);

    //register sender to appMessenger
    //send function for platform Messenger to call send
    const send = function(appMessage){
        if(!(appMessage instanceof AppMessage)){
            throw "Input is not of type AppMessage";
        }
        let eMessage = encryptContent(JSON.stringify(appMessage.getMessage()))
        svcMgr.ServiceManager.callOperation('activeMQConnector', 'destination', 'sendToDestination',
        {
            'ipAddress':"192.168.1.183",
            'port':61613,
            'type':messageDestinationType,
            'destination':messageDestination,
            'username':'admin',
            'password':'admin',
            'content':eMessage
        },function(msg){console.log(msg);},allAccessObj);
    } ;

    //construct sender object to register with platform Messenger
    const sender = {
        send: send,
        source: getIp()
    };
    appMessenger.registerSender(sender);

    //look at all the package models and create them
    let modelsPath =  path.join(__dirname, 'Models');
    let allPromises = [];
    if (fs.existsSync(modelsPath)) //if the models directory exists
    {
        //get all models file name
        let modFileNames = fs.readdirSync(modelsPath);
        //iterate all models file name
        modFileNames.forEach(function(modFileName) {
            let modelFilePath = path.join(modelsPath, modFileName)
            allPromises.push(PakManager.dbMgr.addModel(modelFilePath, modFileName));
        });
    }
    // Promise.all(allPromises).then(function() {
    //     let peers = [];
        
    //     PakManager.svcMgr.ServiceManager.callDBOperation.query(
    //         "MsgWS_Peers", 
    //         {},
    //         function(dbResponse){
    //             if(!dbResponse.data
    //                 && Array.isArray(dbResponse.data)
    //                 && dbResponse.data.length === 0){ //cannot find any entry in DB
                    
    //                 //create entry in DB
    //                 PakManager.svcMgr.ServiceManager.callDBOperation.create(
    //                     "MsgWS_Peers", 
    //                     {
    //                         "IP": selfIP,
    //                         "PORT": selfPort,
    //                         "DTE_ONLINE": new Date()
    //                     },
    //                     function(data){console.log("Registered self");},
    //                     allAccessObj);
            
                
    //             }else{ //there are entries in DB
    //                 //initialize connections
                    
    //                 //check if is self in the result, if not add to peers array
    //                 let found = false;
    //                 for(let idx = 0; idx < dbResponse.data.length; idx++){
    //                     let dbResData = dbResponse.data[idx];
    //                     // console.log("=====================================>dbResData");
    //                     // console.log(dbResData);
    //                     if(dbResData.IP === selfIP
    //                         && dbResData.PORT === selfPort){
    //                         found |= true;
    //                     }else{
    //                         // peers[dbResData.IP] = dbResData.PORT;
    //                         peers.push(dbResData);
    //                     }
    //                 }

    //                 if(!found){
    //                     //create entry in DB
    //                     PakManager.svcMgr.ServiceManager.callDBOperation.create(
    //                         "MsgWS_Peers", 
    //                         {
    //                             "IP": selfIP,
    //                             "PORT": selfPort,
    //                             "DTE_ONLINE": new Date()
    //                         },
    //                         function(data){},
    //                         allAccessObj);

    //                 }
    //             }

    //             //check if a connection with the peer has been formed
    //             for(let pi = 0; pi < peers.length; pi++){   
    //                 let peerObj = peers[pi];
    //                 if(!authenticatedConn[peerObj.IP +"-"+ peerObj.PORT]){
    //                     createConnection(peerObj.IP, peerObj.PORT);
    //                 }
                    
    //             }
    //         },
    //         allAccessObj);

    // }, function() {
    //     // one or more failed
    //     console.log("Cannot create the peer related data.");
    // });


    //look at all web app contexts
    // let webAppContextsPath =  path.join(__dirname, 'WebApp', "views");
    // //get all other scripts and css directories
    // let scriptDirs = [];
    // if (fs.existsSync(webAppContextsPath)) //if the web app directory exists
    // {
    //     //get all contexts
    //     let contexts = fs.readdirSync(webAppContextsPath);
    //     //iterate all context to add scripts and css directoryu
    //     contexts.forEach(function(context) {
    //         scriptDirs.push(path.join(webAppContextsPath, context,"main","script"));
    //         // scriptDirs.push(path.join(webAppContextsPath, context,"main","css"));
    //         //scriptDirs.push(path.join(webAppContextsPath, context,"pages"));
    //     });
    // }

    

    //register the view with the platform
    // PakManager.webMgr.registerView({
    //     contextPath: pakDetails.WebContext,
    //     directory: webAppContextsPath,
    //     miscellaneous: scriptDirs
    // });
}

const undeploy = function(dbMgr, svcMgr, webMgr, appMessenger){
    //stop all socket connection
    // Object.keys(authenticatedConn).forEach(function(socketKey){
    //     try{
    //         let socket = authenticatedConn[socketKey];
    //         socket.close();
    //     }catch(err){
    //         console.log("Socket connection cannot be closed")
    //     }
    // });

    // //close websocket server
    // wss.close(function(){
    //     console.log("Messenger(Web Socket) closed.");
    //     appMessenger.deregisterSender();
    // });

    // Object.keys(extReconnInt).forEach(function(pendingConnKey){
    //     clearInterval(extReconnInt[pendingConnKey]);
    // })
    
}

const PakManager = {
    init:init,
    undeploy: undeploy,
    pakDetails:pakDetails
};

module.exports = PakManager;