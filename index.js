const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY) 
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

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
    // await client.connect();
    const usersCollection = client.db("sportsdb").collection("users");
    const classesCollection = client.db("sportsdb").collection("classes");
    const instructorsCollection = client.db("sportsdb").collection("instructors");
    const instructorsClassCollection = client.db("sportsdb").collection("instructorclass");
    const selectClassCollection = client.db("sportsdb").collection("selectclass");
    const paymentCollection = client.db("sportsdb").collection("payments");
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '48h' })
      res.send({ token })
    })
    //admin verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next();
    }
    //instructor verify
    const verifyInstructors = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'instructors') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next();
    }


    //users api
    app.get('/users', verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);

    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.get('/users/instructors/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructors: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructors: user?.role === 'instructors' }
      res.send(result)
    })


    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.patch('/users/instructors/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructors'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    //instructor class

    app.post('/instructorclass', async (req, res) => {
      const instructorclass = req.body;
   instructorclass.status = 'pending';
      console.log(instructorclass)
      const result = await instructorsClassCollection.insertOne(instructorclass);
      res.send(result);

    })

   app.patch('/instructorclass/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const result = await instructorsClassCollection.updateOne({ _id:new ObjectId(id) }, { $set: { status } });
  res.send(result);
});

app.patch('/instructorclass/:id/approve', async (req, res) => {
  const { id } = req.params;
  
  const result = await instructorsClassCollection.updateOne({ _id:new ObjectId(id) }, { $set: { status: 'approved' } });
  res.send(result);
});

app.patch('/instructorclass/:id/deny', async (req, res) => {
  const { id } = req.params;
  
  const result = await instructorsClassCollection.updateOne({ _id:new ObjectId(id) }, { $set: { status: 'denied' } });
  res.send(result);
});

    app.get('/instructorclass', async (req, res) => {
      const result = await instructorsClassCollection.find().toArray();
      res.send(result);
    })

  

    // app.get('/instructorclass', async (req, res) => {
    //    const result = await instructorsClassCollection.find({ status: 'approved' }).toArray();
    //   res.send(result);
    // })

    //select class

     app.get('/class', async(req,res)=>{
    const email=req.query.email;
    if(!email){
      res.send([]);
    }
    // const decodedEmail=req.decoded.email;
    // if(email !== decodedEmail){
    //   return res.status(403).send({error:true,message:'forbidden access'})
    // }
    const query={email:email};
    const result=await selectClassCollection.find(query).toArray();
    res.send(result)
   });

       app.post('/class',async(req,res)=>{
      const item=req.body;
      console.log(item)
      const result=await selectClassCollection.insertOne(item);
      res.send(result)
    }) 

      app.delete('/class/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await selectClassCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
       const result = await classesCollection.find().toArray();
      res.send(result);
    })

    // app.post('/classes',verifyJWT, async(req,res)=>{
    //   const newClass=req.body;
    //   const result=await classesCollection.insertOne(newClass);
    //   res.send(result)
    // })
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    })

        //create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price, email } = req.body;
      const amount = parseInt(price * 100);
    
    
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
          receipt_email: email, // Provide the email address for billing details
        });
    
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
    
        if (error.code === 'email_invalid') {
          // Handle the specific error when the email is invalid
          return res.status(400).send('Invalid email address');
        }
    
        res.status(500).send('Error creating payment intent');
      }
    });
   
    //payment
        app.post('/payments',verifyJWT, async(req,res)=>{
          const payment = req.body;
          const insertResult=await paymentCollection.insertOne(payment)

          
          res.send({insertResult})
        })

        app.get("/payments", verifyJWT, async (req, res) => {
  const payments = await paymentCollection.find().toArray();
  res.send(payments);
});


     


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('school is running')
})

app.listen(port, () => {
  console.log(`Sports academy is running on port:${port}`);
})