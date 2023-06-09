const express=require('express');
const app=express();
const cors=require('cors');
require('dotenv').config()
const port=process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m5uzxbx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection=client.db("sportsdb").collection("users");
    const classesCollection=client.db("sportsdb").collection("classes");
    const instructorsCollection=client.db("sportsdb").collection("instructors");
    // const instructorsClassCollection=client.db("sportsdb").collection("instructorclass");

    //users api
    app.get('/users',async(req,res)=>{
      const result=await usersCollection.find().toArray();
      res.send(result)
    })

    app.post('/users',async(req,res)=>{
      const user=req.body;
      console.log(user)
      const query={email:user.email}
      const existingUser=await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists'})
      }
      const result=await usersCollection.insertOne(user);
      res.send(result);
    
    })

    app.patch('users/admin/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const updateDoc = {
        $set:{
          role:'admin'
        },
      };
      const result=await usersCollection.updateOne(filter,updateDoc);
      res.send(result);

    })

    app.get('/classes',async(req,res)=>{
        const result=await classesCollection.find().toArray();
        res.send(result);
    })
    app.get('/instructors',async(req,res)=>{
        const result=await instructorsCollection.find().toArray();
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('school is running')
})

app.listen(port,()=>{
    console.log(`Sports academy is running on port:${port}`);
})