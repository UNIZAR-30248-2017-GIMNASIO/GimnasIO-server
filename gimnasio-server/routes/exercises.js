var express = require('express');
var router = express.Router();

var mongoDb = require('../database/mongo');

/**
 * Type: GET
 * Name: /exercises/
 * Description: Returns a JSON containing every exercise on the Database.
 * Request:
 *     -Headers: Credentials
 *       -user: string
 *       -pwd: string
 * Responses:
 *      200:
 *          -JSON object containing multiple exercise objects:
 *              -id: string
 *              -name: string
 *              -muscle: string
 *              -description: string
 *              -images: [string]
 *              -tag: string
 *      404:
 *          -A feedback object
 *      500:
 *          -A feedback object
 */
router.get('/', function(req, res) {
    if(req.headers.user && req.headers.pwd){
        mongoDb.getExercises(req.headers.user, req.headers.pwd, function (err, result) {
            if(!err){
                var jsonres = {};
                for(var i=0; i < result.length; i++) {
                    jsonres[i] = result[i];
                }
                res.status(200).json(jsonres);
            }
            else res.status(404).send({
                'success': false,
                'message': err
            });
        })
    }
    else res.status(404).send({
        'success': false,
        'message': "Cabecera de la peticion vacía o incorrecta."
    });

});

/**
 * Type: GET
 * Name: /exercises/download
 * Description: Returns an image for the exercise given.
 * Request:
 *     -Headers: Credentials
 *       -image: string
 * Responses:
 *      success:
 *          -Sends the image desired
 *      404:
 *          -A feedback object
 */
router.get('/download', function(req, res){
    if(req.headers.image){
        var fileExtension = require('file-extension');
        var fs = require('fs');
        var file = req.headers.image;
        var ext = fileExtension(file);
        var img = './data/images/' + file;
        fs.stat(img, function(err, stat) {
            if(err === null){
                res.download(img); // Set disposition and send it.
            } else if(err.code === 'ENOENT') {
                res.status(404).send({
                    success: false,
                    message: 'Archivo no existente.'
                });
            } else {
                res.status(500).send({
                    sucess: false,
                    message: 'Fallo interno de servidor, por favor contacte a un administrador'
                })
            }
        });
    }
    else res.status(404).send({
        success: false,
        message: 'Header incorrecto o inexistente'
    })
});

/**
 * de momento se queda asi, pero habra que moverlo a otro metodo
 */
router.post('/massive', function(req, res) {
    // require csvtojson
    var csv = require("csvtojson");

    // Convert a csv file with csvtojson
    var ok = true;
    csv({encoding: 'utf-8'})
        .fromFile('./data/files/ejercicios.csv')
        .on("end_parsed",function(jsonArrayObj){ //when parse finished, result will be emitted here.
            if (jsonArrayObj !== null) {
                jsonArrayObj.forEach( function (objeto) {
                    var name = objeto.Nombre;
                    var muscle = objeto.Musculos;
                    var description = objeto.Descripcion;
                    var image = objeto.Imagen;
                    var tag = objeto.Tag;
                    mongoDb.getExerciseByName(req.headers.user, req.headers.pwd, name, function (err, result) {
                        if (!result) {
                            mongoDb.insertExercise(req.headers.user, req.headers.pwd, name,muscle,description,image,tag, function (result) {
                                if (result !== 'OK') {
                                    ok = false;
                                }
                            });
                        } else {
                            console.log('Exercise with name ' + name + ' found, maybe u wanna try to fuck my mongo?');
                        }
                    });

                });
                if (ok) {
                    mongoDb.getLastUpdate(req.headers.user, req.headers.pwd, function (result) {
                        if (!result) {
                            mongoDb.insertLastUpdate(req.headers.user,req.headers.pwd, function (res) {
                                console.log("Inserted lastUpdate");
                            });
                        } else {
                            mongoDb.updateLastUpdate(req.headers.user,req.headers.pwd, res.body.lastUpdate, function (res) {
                                console.log("Updated lastUpdate");
                            });
                        }
                    });
                    res.status(200).send('OK');
                }
            }
        });
});

module.exports = router;
