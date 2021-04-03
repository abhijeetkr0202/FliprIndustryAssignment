var https=require('https');
var express=require('express');
const app=express();
const MongoClient = require('mongodb').MongoClient;
const { join, resolve } = require('path');
const { query, response } = require('express');
const { stat } = require('fs');
const request = require('request');
const fetch = require('node-fetch');


app.use(express.json());
app.use(express.urlencoded());


//returns array of (count)number of devices from specified collection
function getDevices(db,colA,count)
{
  var cursor=db.collection(colA).find().limit(count).sort({'createdAt':-1});
  var deviceList=cursor.toArray();

  return deviceList;
}





//returns array of (count)number of locations for device passed 
function getStatus(device,db,colB,count)
{

  var query={"device":device.id};
  var cur=db.collection(colB).find().limit(count).sort({"createdAt":1});
  var statusList=cur.toArray();


  return statusList;
 
}




//return modified device Array with locations added as value for key "statusLoc"
async function getDeviceStatus(deviceList,db,colB,count,arr)
{
  var darr=new Array();

  for await (const device of deviceList) {
    
    let val;
    var promise1=new Promise(function(resolve,reject)
    {
      resolve(getStatus(device,db,colB,count));
    });
        
    var thenedPromise = promise1.then(function(value)
    {
      val=value;
    });

    await thenedPromise;
    darr.push(val);
    device.statusLoc=val;

    }


 return deviceList;
}




//main function
async function main(uri,dbName,colA,colB,countA,countB,req,res,arr){
  
  const client = new MongoClient(uri,{useNewUrlParser:true,useUnifiedTopology:true});
  try{
      await client.connect(async function(err)
      {
          console.log("Successfully connected to server.");
          const db=client.db(dbName);


          var data=await getDevices(db,colA,countA);
        

          var statusData = await getDeviceStatus(data,db,colB,countB,arr);
          res.set({
            'name':'abhijeet',
            "contact":"977777777"
          });
          res.json(statusData);

      });   
  }
  catch(e){
      console.error(e);
  }
  finally{
      await client.close();
      console.log("Disconnected from server !");
  }
}

//adding custom headers
// res.send(body|status[, headers|status[, status]])






//post request function for sending device_location data
//use uri as key in POST request (body) for mongoDB_url

app.post('/device_details/:colA',function(req,res)
{
  
  const uri=req.body.uri;

  let colA=req.params.colA,
      colB=req.query.colB;
  // const uri="mongodb+srv://backendconcoxdeveloper:V3jUV7QXqEoAtnhy@cluster0-zhjde.mongodb.net";
  
  const dbName='__CONCOX__';
  countA=30;
  countB=50;

  var arr={};
  main(uri,dbName,colA,colB,countA,countB,req,res,arr).catch(console.error);
  
  

});


//********************************SECOND API ********************************************* */

//Returns url for geocode cordinates request
function urlBuilder(add,geokey)
{
  var url="https://maps.googleapis.com/maps/api/geocode/json?address=";
  url=url+add+"&key="+geokey;
  return url;
}


//returns array of objects with key as address and cordinates (array) as value 
async function getCordinatesArray(dataArray,addresses,geokey)
{ 
    for await (var address of addresses) {
      
      var res=await fetchDataAsync(address,geokey);
      var cordinates=new Array();
      let result;
     
      var promise1=new Promise(function(resolve,reject){
        resolve(res);
      });
     
      var thenedPromise = promise1.then(function(value)
      {
          result=value;
      });

      await thenedPromise;
      
      
      try
      {
      var lat=result.results[0].geometry.location.lat;
      var lng=result.results[0].geometry.location.lng;
      }
      catch(e)
      {
        var lat="NO RESULTS !";
        var lng="NO RESULTS !"
      }
      cordinates.push(lat);
      cordinates.push(lng);
      //converting address to string
      var a=JSON.stringify(address);
      
      var locData={};
      locData[a]=cordinates;

      dataArray.push(locData);
      
    }


 return dataArray;
}

//async function used to fetch json data from api(google api)
async function fetchDataAsync(address,geokey) {
  var url = urlBuilder(address,geokey);
  const response = await fetch(url);
  var res=await response.json();
  return res;
}



//array of addresses to be passed in body of post request as shown
/*  {"addresses":["Plot No:1, Sadarpur, Sector-45, Noida, Uttar Pradesh 201303, India","D-002, Sector 75 Road, Sector 75, Noida, Uttar Pradesh 201301, India"]} */

//post request to send cordinates for array of address received
app.post('/address_locator',async function(req,res)
{

  var dataArray=new Array();
  geokey="AIzaSyA5bwbEsAOUMOI4RK2zXcIayG4vjuQSpcw";
  var addresses=req.body.addresses;
  try{
  var a=await getCordinatesArray(dataArray,addresses,geokey);
  res.json(a); 
  }
  catch(e)
  {
    res.json({"error handled":"error handled"});
  }
 
});

app.get('/',function(req,res)
{
  res.send("GET METHOD NOT ALLOWED :(");
});

// var server = app.listen(2000,function()
// {
//   var host=server.address().address
//   var port=server.address().port
//   console.log("Server running!")
// });

const port = process.env.PORT || '2000';
app.listen(port, () => console.log(`Server started on Port ${port}`));