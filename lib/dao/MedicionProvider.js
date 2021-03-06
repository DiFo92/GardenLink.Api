/*
 * dao.MedicionProvider
 * https://github.com/Gerdenlink
 *
 */

var method = MedicionProvider.prototype;

var Models;
var MongoModels;

var _logs;
var _moment;

var DweetIO = require("node-dweetio");
var _dweetClient;

var _DEBUG = false;

var DWEET = "Dweet";
var MONGO = "Mongo";

var async = require('async');

var _dweet_prefijo;

var Datastore = require('nedb');
var db = {};


var _provider = {
  DWEET : false,
  MONGO : false,
  NEDB :false
};



function MedicionProvider(logs, moment, config) {
  console.log("Inicializando SensorMedicionProvider..");
  _logs = logs;

    if (config.MONGO.Habilitado == "true") {

      if (config.MONGO.Debug) {
	  	_DEBUG = config.MONGO.Debug == "true" ? true : false;
	  	}

      _provider.MONGO = true;
        Models = require("../dto/Medicion.js");

      var mongoose = config.MONGO.DataSource, Schema = mongoose.Schema;

      var MedicionSchema = new Schema({
          Id             : Number
		  , IdTipoActuador : Number
		  , IdActuador	   : Number
		  , IdDispositivo  : String
		  , TimeStamp      : { type: Date, default: Date.now }
		  , Valor          : Number
          });


      MongoModels = mongoose.model('Medicion', MedicionSchema)


    }

    if (config.DWEET.Habilitado == "true"){
      _provider.DWEET = true;
      this._dweetClient = new DweetIO();
      Models = require("../dto/Medicion.js");
      _dweet_prefijo = config.DWEET.prefijo_sensor;
    }

    if (config.NEDB.Habilitado == "true"){
      _provider.NEDB = true;

      if (config.NEDB.Debug) {
	  	_DEBUG = config.NEDB.Debug == "true" ? true : false;
	  	}
      db.Medicion = new Datastore({ filename: config.NEDB.Path + 'Medicion.db', autoload:true});

      Models = require("../dto/Medicion.js");
    }

}

//Version para grabar por metodo de Sincronizacion de bases
method.SaveSync = function(id, idTipoActuador,idActuador,idDispositivo,timeStamp, valor, callback) {
  if (_provider.MONGO) {

    var obj = {
      IdTipoActuador : idTipoActuador,
      IdActuador : idActuador,
      IdDispositivo : idDispositivo,
      TimeStamp : timeStamp,
      Valor : valor
    };

    var objMongo = new MongoModels(obj);

    MongoModels.findOne({TimeStamp : timeStamp}, function (err, data) {
        if (!data) {
           objMongo.save(function(error, data) {
             if (error) {
               if (_DEBUG)
                 console.log("<MONGO> MedicionProvider.SaveSync : error al insertar nuevo objeto, detalle : " + JSON.stringify(error));

                 if(callback)
                  return callback(error, data);
             }
             else {
           if (_DEBUG)
             console.log("<MONGO> MedicionProvider.SaveSync : inserto nuevo objeto, detalle : " + JSON.stringify(obj));
           if(callback)
            return callback(error, data);
           // newDoc is the newly inserted document, including its _id
           // newDoc has no key called notToBeSaved since its value was undefined
            }
           });
        }
        else {
          MongoModels.update({ _id : data._id }, {  $set: {
              IdTipoActuador : obj.IdTipoActuador,
              IdActuador : obj.IdActuador,
              IdDispositivo : obj.IdDispositivo,
              TimeStamp : obj.TimeStamp,
              Valor : obj.Valor
              }
            }, { multi : false}, function (err, numReplaced) {
              if (err) {
                console.log("<MONGO> MedicionProvider.SaveSync : Error al updatear" + err);
                if (callback)
                  return callback(err, null);
              }
              else {

              if (_DEBUG)
                console.log("<MONGO> MedicionProvider.SaveSync : Remplazados: " + JSON.stringify(numReplaced));
                if(callback)
                    return callback(err, numReplaced);
              }
          });
        }
    });

  }

  if (_provider.NEDB) {
    throw new Error("MedicionProvider.SaveSync -> No implementado para NEDB");
  }


}



method.Save = function(idTipoActuador, idActuador, idDispositivo, valor, callback) {

    if (_provider.MONGO) {

       var medicion = new Models();
        medicion.Crear(null, idTipoActuador, idActuador, idDispositivo, Date.now(), valor);
      var objMongo = new MongoModels(medicion.Objeto());

        objMongo.save(function(err, data) {
          if (err) { _logs.error("MedicionProvider: Error al grabar en base de datos. Detalle: +" + err);  }

          if(callback)
			return callback(err,data);

        });
    }

     if (_provider.DWEET) {
      var medicion = new Models();
      medicion.Crear(null, idTipoActuador, idActuador, idDispositivo, Date.now(), valor);

      this._dweetClient.dweet_for(GenerarDweetId(idActuador), medicion.Objeto(), function(err, dweet){

          if (err) {console.log(err);} else {

          console.log(dweet.thing); // "my-thing"
          console.log(dweet.content); // The content of the dweet
          console.log(dweet.created); // The create date of the dweet
        }


      });
    }

     if (_provider.NEDB) {
        var medicion = new Models();
        medicion.Crear(null, idTipoActuador, idActuador, idDispositivo, Date.now(), valor);
        if (medicion.Validar(medicion.Objeto()))
        {
	        db.Medicion.insert(medicion.Objeto(), function (err, newDoc) {   // Callback is optional
	          if (_DEBUG)
	            console.log("inserto nueva medicion");
	          // newDoc is the newly inserted document, including its _id
	          // newDoc has no key called notToBeSaved since its value was undefined

	          if(callback)
              	return callback(err,newDoc);

	          });
        }
        else
        {
        	if (callback)
        		return callback(null,null);
        }
     }

};


method.GetCollection = function(filter, callback) {

 if (_provider.MONGO) {
    var lstModels = [];

     var filters = {};
      if (filter.IdActuador)
      	filters.IdActuador = filter.IdActuador;

      if (filter.IdTipoActuador)
      	filters.IdTipoActuador = filter.IdTipoActuador;

      if (filter.IdDispositivo)
      	filters.IdDispositivo = filter.IdDispositivo;

      if (filter.TimeStamp)
      	filters.TimeStamp = filter.TimeStamp;


       if (filters.length == 0) {
	      	if (_DEBUG)
	      		console.log("Medicion.method.GetCollection() no se han seteado filtros");
	      }

    MongoModels.find(filters).exec(function(err, docs) {
       if (err) return callback(err, null)
       else {
         if (docs.length > 0) {
          if (_DEBUG)
          	console.log("MedicionProvider.GetCollection() -> : Cantidad Encontrados : " + docs.length);

          async.each(docs, function(doc, cb) {
            var sensorModel = new Models();
            sensorModel.Crear(doc._id, doc.IdTipoActuador, doc.IdActuador,doc.IdDispositivo, doc.TimeStamp, doc.Valor);
            lstModels.push(sensorModel.Objeto());

          }, function(error) {
          	if (_DEBUG) console.log("MONGO: Error al leer async en mettodo GetAll() error : " + error);
          	if (callback)
          		return callback(error,null);
          	});
          }
        if (callback)
        	return callback(null, lstModels);
       }
     });
  }

  if (_provider.NEDB) {
      var lstModels = [];

      var filters = {};
      if (filter.IdActuador)
      	filters.IdActuador = parseInt(filter.IdActuador);

      if (filter.IdTipoActuador)
      	filters.IdTipoActuador = parseInt(filter.IdTipoActuador);

      if (filter.IdDispositivo)
      	filters.IdDispositivo = filter.IdDispositivo;

        if (filter.TimeStamp)
          filters.TimeStamp = filter.TimeStamp;

       if (filters.length == 0) {
	      	if (_DEBUG)
	      		console.log("Medicion.method.GetCollection() no se han seteado filtros");
	      }

      var sortCriteria = null;
      if (filter.sortObject)
        sortCriteria = filter.sortObject;

      var cantidadLimite = null;
      if (filter.limit)
        cantidadLimite = filter.limit;


      db.Medicion.find(filters).sort(sortCriteria).limit(cantidadLimite).exec(function(err, docs) {
      //db.Medicion.find(filters, function (err, docs) {

        if (err) {
           if (_DEBUG) console.log("Error al leer async en mettodo GetAll() error : " + error);
           return callback(err, null);
        }
        else
        {
          console.dir(docs);
          if (docs.length > 0) {
          async.each(docs, function(doc, cb) {
            var sensorModel = new Models();
            sensorModel.Crear(doc._id,doc.IdTipoActuador, doc.IdActuador,doc.IdDispositivo, doc.TimeStamp, doc.Valor);
            lstModels.push(sensorModel.Objeto());

          }, function(error) {
          	if (_DEBUG) console.log("Error al leer async en mettodo GetAll() error : " + error);
          		if (callback)
        			return callback(error, null);

          	});
          }
          return callback(null, lstModels);
        }
      });
  }
  else if (_provider.DWEET) {

    this._dweetClient.get_all_dweets_for(GenerarDweetId(filter.IdSensor), function(err, dweets) {

      var lstModels = [];

      if (err) {
        console.log("Error al obtener dweets, mensaje de error: " + err);
        return callback(err, lstModels);
      }
      else
      {


        for(theDweet in dweets)
        {
            var dweet = dweets[theDweet];

            var medicion = new Models();
              medicion.Crear(0, dweet.content["IdSensor"], dweet.content["IdDispositivo"], dweet.content["TimeStamp"], dweet.content["Valor"]);
              lstModels.push(medicion.Objeto());

            console.log(dweet.thing); // The generated name
            console.log(dweet.content); // The content of the dweet
            console.log(dweet.created); // The create date of the dweet
        }
        return callback(null, lstModels);
      }
    });
  }



};


//devuelve los n ultimos segun el parametro cantidad
method.GetLastN = function(filter, cantidad, callback) {



  if (_provider.MONGO) {

	 var filters = { };
   
   if (filter.IdTipoActuador)
	 	filters.IdTipoActuador = parseInt(filter.IdTipoActuador);

	 if (filter.IdActuador)
	 	filters.IdActuador = parseInt(filter.IdActuador);
    
	 var sortCriteria = filter.sortObject;


	 MongoModels.find().sort(sortCriteria).limit(cantidad).exec(function(err, docs) {
     	if (err)
     		return callback (err, null);

     	return callback(null, docs);
     });


  }

  if (_provider.DWEET) {

    this._dweetClient.get_all_dweets_for(GenerarDweetId(filter.Id), function(err, dweets) {

      var dweet = dweets[0]; // Dweet is always an array of 1
      var medicion = new Models();
      medicion.Crear(0, dweet.content["IdSensor"], dweet.content["IdDispositivo"], dweet.content["TimeStamp"], dweet.content["Valor"]);
      return callback(null, medicion);
    });
  }

  if (_provider.NEDB) {

    var filters = { };
    /*
   if (filter.IdTipoActuador)
	 	filters.IdTipoActuador = filter.IdTipoActuador;

	 if (filter.IdActuador)
	 	filters.IdActuador = filter.IdActuador;
   */
	 var sortCriteria = filter.sortObject;


	 db.Medicion.find().sort(sortCriteria).limit(cantidad).exec(function(err, docs) {
     	if (err)
     		return callback (err, null);

     	return callback(null, docs);
     });
  }



};


method.GetLast = function(filter, callback) {



  if (_provider.MONGO) {

	 var filters = { };
	 if (filter.IdTipoActuador)
	 	filters.IdTipoActuador = filter.IdTipoActuador;

	 if (filter.IdActuador)
	 	filters.IdActuador = filter.IdActuador;

	 var sortCriteria = filter.sortObject;


	 MongoModels.findOne(filters).sort(sortCriteria).exec(function(err, docs) {
     	if (err)
     		return callback (err, null);

     	return callback(null, docs);
     });


  }

  if (_provider.DWEET) {

    this._dweetClient.get_all_dweets_for(GenerarDweetId(filter.Id), function(err, dweets) {

      var dweet = dweets[0]; // Dweet is always an array of 1
      var medicion = new Models();
      medicion.Crear(0, dweet.content["IdSensor"], dweet.content["IdDispositivo"], dweet.content["TimeStamp"], dweet.content["Valor"]);
      return callback(null, medicion);
    });
  }

  if (_provider.NEDB) {

    var filters = { };
	 if (filter.IdTipoActuador)
	 	filters.IdTipoActuador = parseInt(filter.IdTipoActuador);

	 if (filter.IdActuador)
	 	filters.IdActuador = parseInt(filter.IdActuador);

	 var sortCriteria = filter.sortObject;


	 db.Medicion.findOne(filters).sort(sortCriteria).exec(function(err, docs) {
     	if (err)
     		return callback (err, null);

     	return callback(null, docs);
     });
  }



};



method.GetAll = function(callback) {

 if (_provider.MONGO) {
    var lstModels = [];
    MongoModels.find({}).exec(function(err, docs) {
       if (err) return callback(err, lstModels)
       else {
         if (docs.length > 0) {
          async.each(docs, function(doc, cb) {
            var sensorModel = new Models();
            sensorModel.Crear(doc._id, doc.IdTipoActuador, doc.IdActuador,doc.IdDispositivo, doc.TimeStamp, doc.Valor);
            lstModels.push(sensorModel.Objeto());

          }, function(error) { if (_DEBUG) console.log("MONGO: Error al leer async en mettodo GetAll() error : " + error); });
          }
        return callback(null, lstModels);
       }
     });
  }

  if (_provider.NEDB) {
      var lstModels = [];
      db.Medicion.find({}, function (err, docs) {

        if (err) {
           if (_DEBUG) console.log("Error al leer async en mettodo GetAll() error : " + error);
           return callback(err, lstModels);
        }
        else
        {
          if (docs.length > 0) {
          async.each(docs, function(doc, cb) {
            var sensorModel = new Models();
            sensorModel.Crear(doc._id, doc.IdTipoActuador, doc.IdActuador,doc.IdDispositivo, doc.TimeStamp, doc.Valor);
            lstModels.push(sensorModel.Objeto());

          }, function(error) { if (_DEBUG) console.log("Error al leer async en mettodo GetAll() error : " + error); });
          }
          return callback(null, lstModels);
        }
      });
  }
  else if (_provider.DWEET) {

    this._dweetClient.get_all_dweets_for(GenerarDweetId(filter.IdSensor), function(err, dweets) {

      var lstModels = [];

      if (err) {
        console.log("Error al obtener dweets, mensaje de error: " + err);
        return callback(err, lstModels);
      }
      else
      {


        for(theDweet in dweets)
        {
            var dweet = dweets[theDweet];

            var medicion = new Models();
              medicion.Crear(0, dweet.content["IdSensor"], dweet.content["IdDispositivo"], dweet.content["Pin"], dweet.content["TimeStamp"], dweet.content["Valor"]);
              lstModels.push(medicion.Objeto());

            console.log(dweet.thing); // The generated name
            console.log(dweet.content); // The content of the dweet
            console.log(dweet.created); // The create date of the dweet
        }
        return callback(null, lstModels);
      }
    });
  }



};

function GenerarDweetId(sensor) {
  return _dweet_prefijo + sensor;

};


module.exports = MedicionProvider;
