module.exports = function(app, moment, dataProvider, logger,middleware){

var ArestLibrary = require("../lib/servicios/Arest.js");
var NetworkingLibrary = require("../lib/util/Net.js");
var arduinoService;

var req = require('restler');
var async = require('async');
var _ = require('underscore');



/* REST API */

/**
 * @api {get} /api/dispositivos/:id Obtener informacion de un dispositivo determinado
 *
 * @apiParam {id} id Dispositivo (unico)
 *
 * @apiSuccess {json} El objeto solicitado.
 */
app.get('/api/v1/dispositivos/:id', middleware.EnsureAuthenticated, function (request, response) {
    var dispositivo = request.params.id;

     var filter = {Id : String};
    filter.Id = dispositivo;
    dataProvider.Device().Find(filter, function(err, data) {
      if (data) {
        response.send(data);
      }
      else
      {
      	response.send("");
      }
    });
});

app.get('/api/v1/dispositivos/:id/sensores', middleware.EnsureAuthenticated,function (request, response) {
    var dispositivo = request.params.id;

     var filter = {IdDispositivo : String};
    filter.IdDispositivo = dispositivo;
    dataProvider.Sensor().GetCollection(filter, function(err, data) {
      if (data) {
        response.send(data);
      }
      else
      {
      	response.send("");
      }
    });
});

app.get('/api/v1/dispositivos/:id/relays', middleware.EnsureAuthenticated,function (request, response) {
    var dispositivo = request.params.id;

     var filter = {IdDispositivo : String};
    filter.IdDispositivo = dispositivo;
    dataProvider.Relay().GetCollection(filter, function(err, data) {
      if (data) {
        response.send(data);
      }
      else
      {
      	response.send("");
      }
    });
});

app.get('/api/v1/dispositivos/:id/motores', middleware.EnsureAuthenticated,function (request, response) {
    var dispositivo = request.params.id;

     var filter = {IdDispositivo : String};
    filter.IdDispositivo = dispositivo;
    dataProvider.Motor().GetCollection(filter, function(err, data) {
      if (data) {
        response.send(data);
      }
      else
      {
      	response.send("");
      }
    });
});

/**
 * @api {get} /api/dispositivos Obtiene el listado de dispositivos
 *
 * @apiSuccess {array} El arreglo de objetos solicitado
 */
app.get('/api/v1/dispositivos', middleware.EnsureAuthenticated,function(request, response){
	 dataProvider.Device().GetAll(function(err, data) {
      if (data && data.length > 0) {
        response.json(data);
      }
      else
      {
      	response.json("");
      }
    });
});

/**
 * @api {post} /api/dispositivos Crea un dispositivo
 * @apiSuccess {json} ok
 */
app.post('/api/v1/dispositivos',middleware.EnsureAuthenticated,function(request, response) {

	var id = request.body.Id;
    var nombre = request.body.Nombre;
    var tipo = request.body.Tipo;
    var ip = request.body.Ip;
    var puerto = request.body.Puerto;
    var habilitado = request.body.Habilitado;
    var estado = request.body.Estado;
    var ip = request.body.Ip;
    var frecuencia = request.body.FrecuenciaMuestreo;

    dataProvider.Device().Save(id, nombre, tipo, ip,puerto,habilitado,estado,frecuencia);

    response.json("ok");


});

/**
 * @api {put} /api/dispositivos/:id Modifica un dispositivo
 * @apiSuccess {json} ok
 */
app.put('/api/v1/dispositivos/:id', middleware.EnsureAuthenticated,function(request, response) {

   	var id = request.params.id;
    var nombre = request.body.Nombre;
    var tipo = request.body.Tipo;
    var ip = request.body.Ip;
    var puerto = request.body.Puerto;
    var habilitado = request.body.Habilitado;
    var estado = request.body.Estado;
    var ip = request.body.Ip;
    var frecuencia = request.body.FrecuenciaMuestreo;

    dataProvider.Device().Save(id, nombre, tipo, ip,puerto,habilitado,estado,frecuencia);

    response.json("ok");

});

/**
 * @api {delete} /api/dispositivos/:id Elimina un dispositivo
 * @apiSuccess {json} ok
 */
app.delete('/api/v1/dispositivos/:id', middleware.EnsureAuthenticated,function(request, response){
	dataProvider.Device().Delete(request.params.id);
	response.json("ok");
});

/**
 * @api {put} /api/dispositivos/:id/ip Modifica la property ip
 * @apiSuccess {json} ok
 */
app.put('/api/v1/dispositivos/:id/subscripcion', middleware.EnsureAuthenticated, function(request, response) {
	var id = request.params.id;
    var ip = request.body.ip;
    var estado = true;

	var filter = {Id : String};
    filter.Id = id;

    dataProvider.Device().Find(filter, function(err, data) {
      if (err){
      	console.log("/api/v1/dispositivos/:id/subscripcion --> Error: " + err);
      }

      if (data) {
      	console.log("Llega peticion -> valor: " + data.FrecuenciaMuestreo);
        dataProvider.Device().Save(data.Id, data.Nombre, data.Tipo, ip,data.Puerto,data.Habilitado,estado, data.FrecuenciaMuestreo);
        var payload = data.FrecuenciaMuestreo + "-" + data.FrecuenciaMuestreo;
        response.json(data.FrecuenciaMuestreo);
      }
      else{
        response.json("-1");
      }
    });
});


app.get('/api/v1/dispositivos/:id/ping', middleware.EnsureAuthenticated, function(request, response) {

	 var dispositivo = request.params.id;

     var filter = {Id : String};
    filter.Id = dispositivo;
    dataProvider.Device().Find(filter, function(err, data) {
      if (data) {
        var net = new NetworkingLibrary();
			net.Ping(data.Ip, function(error, datos) {
				if (error) {
					response.send("");
				}
				else
				{
					response.send(datos);
				}
		});
      }
      else
      {
      	response.send("");
      }
    });



});


app.get('/api/v1/servicio/dispositivos', middleware.EnsureAuthenticated, function(request, response, next){

		dataProvider.Cache(true, function(error, data ) {
				var result = data["Dispositivos"];
				response.json(result);
			});
});

app.get('/api/v1/servicio/dispositivos/:id', middleware.EnsureAuthenticated, function(request, response, next){
		var id = request.params.id;
		dataProvider.Cache(true, function(error, data ) {
				var result = _.find(data.Dispositivos, function(element) {
					return element.Id == id;
				});
				response.json(result);
			});
});




};
