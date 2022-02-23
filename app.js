const fs = require('fs')
const express = require('express')
const ExcelJS = require('exceljs')
const cors = require('cors')
const moment = require('moment')


const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { measureMemory } = require('vm');
const { env } = require('process');


const app = express();
/* Archivo destinado a almacenar las credenciales */
const SESSION_FILE_PATH = './session.json';

//creacion de variables
let client;
let sessionData;


//usamos "App" como un objeto de la librería "express" para crear un appi y consumir el servicio de envío de datos
app.use(cors())
app.use(express.urlencoded({ extended: true }))

const sendWithApi = (req, res) => {

    const{message, to} = req.body; 
    const newNumber = `${to}@c.us`

    console.log(message, to);
    enviarMensaje(newNumber, message)

    res.send({ status: 'Enviado' })
} 

app.post('/send', sendWithApi)

/*Metodo a ejecutar si la sesion está iniciada en el whatsapp */
const conSesion = () =>{
    //si existe una sesion, se carga el archivo session.json que contiene las credenciales

    console.log('Validando sesion con WhatsApp...');
    sessionData = require(SESSION_FILE_PATH);

    client = new Client({
        session:sessionData
    })

    client.on('ready',()=>{
        console.log('El cliente está listo!!');
        recibirMensaje();
    })

    //metodo a ejecutar en caso de que falle la autenticacion
    client.on('auth_failure',()=>{
        
        console.log('**ERROR DE AUTENTICACION, vuelve a generar el cidigo QR (eliminar archivo session.json)**');
    })

    client.initialize();
}

/*Metodo a ejecutar si la sesion no está iniciada en el whatsapp (Genera el codigo QR) */
const sinSesion = () =>{
    
    console.log('No hay una sesion guardada');
    client = new Client();
    client.on('qr', qr =>{
        qrcode.generate(qr, {small: true});
    });

    client.on('authenticated', (session) =>{
        // Guardar informacion de las credenciales para usar la sesion
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
            if(err){
                console.log(err);
            }
        });
    });

    client.initialize();
}

//Funcion para validar la recepcion de mensajes

const recibirMensaje = () =>{
    client.on('message',(msg) =>{

        const {from, to, body} = msg; 

            switch(body){
                case '1': 
                    enviarMensaje(from,'Ha seleccionado *Canales de comunicación* \n\nEn el siguiente enlace podrá obtener informacion con respecto a nuestros canales de comunicación: \nhttps://felcowiki.thefactoryhka.com.co/index.php/Canales_de_Comunicación')
                break;
                case '2':
                    enviarMensaje(from,'Ha seleccionado *Soporte tecnico* \n\nPor favor indique el *número* del producto sobre el que necesita soporte: \n *2.1* HKA Facturación \n *2.2* HKA Nómina\n *2.3* HKA Recepción');
                break;
                    case '2.1':
                        enviarMensaje(from, 'Ha seleccionado *HKA Facturacion*')
                        enviarMedia(from, 'hkafactura.png')
                    break;
                    case '2.2':
                        enviarMensaje(from, 'Ha seleccionado *HKA Nómina*')
                        enviarMedia(from, 'hkanomina.png')
                    break;
                    case '2.3':
                        enviarMensaje(from, 'Ha seleccionado *HKA Recepción*')
                        enviarMedia(from, 'hkarecepcion.png')
                    break;
                case '3':
                        enviarMensaje(from,'Ha seleccionado *Ventas*')
                    break;
                case '4':
                    enviarMensaje(from,'Ha seleccionado *Facturacion*')
                break;
                case '5':
                    enviarMensaje(from,'Ha seleccionado *Proyectos*')
                break;
                default:
                    enviarMensaje(from,'Bienvenido al servicio de atencion automatizada de The Factory HKA. \n\nPor favor indique el *número* del area hacia la que va dirigida su consulta: \n\n *1* Canales de Comunicación \n *2* Soporte tecnico \n *3* Ventas \n *4* Facturación \n *5* Proyectos')
            }

        guardarHistorial(from, body)
        console.log(from, to, body);

        
    })
}

//Funcion para el envío de archivos multimedia
const enviarMedia = (to, file) =>{

    const archivo = MessageMedia.fromFilePath(`./srcMultimedia/${file}`) 
    client.sendMessage(to, archivo) 

}

//Funcion para responder mensajes
const enviarMensaje = (to, message) =>{

    client.sendMessage(to, message)

}

//metodo para guardar en un archivo excel las conversaciones que se tienen con el chatbot
const guardarHistorial = (number, message)=>{

    const pathChat = `./chats/${number}.xlsx`
    const workbook = new ExcelJS.Workbook();
    const today = moment().format('DD-MM-YYYY hh:mm')
    
    //validar si el chat ya existe (si no, se crea)
    if(fs.existsSync(pathChat)){

        workbook.xlsx.readFile(pathChat)
        .then(()=>{
            //agregar una linea al archivo excel ya existente
            const worksheet = workbook.getWorksheet(1);
            const lastRow = worksheet.lastRow;
            let getRowInsert =  worksheet.getRow(++(lastRow.number))
            getRowInsert.getCell('A').value = today;
            getRowInsert.getCell('B').value = message;
            getRowInsert.commit();
            workbook.xlsx.writeFile(pathChat)
            .then(()=>{
                console.log('Se agregó chat a la hoja de excel');
            })
            .catch(()=>{
                console.log('Ha ocurrido un error');
            })
        })
    }else{

        const worksheet = workbook.addWorksheet('chats')
        //creacion de encabezados de la hoja de excel
        worksheet.columns = [
            {header: 'fecha', key:'date'},
            {header: 'Mensaje', key:'message'},
        ]
        //agregar info del mensaje
        worksheet.addRow([today,message])
        workbook.xlsx.writeFile(pathChat)
        .then(() => {

            console.log('Historial creado');
        })
        .catch(() => {

            console.log('Ha ocurrido un error!!');
        })
    }

}

//Condicion ternaria para validar si la sesion está iniciada o no
(fs.existsSync(SESSION_FILE_PATH)) ? conSesion() : sinSesion();

app.listen(9000,()=>{
    console.log('API ESTÁ ARRIBA!');
})