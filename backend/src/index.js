import express from 'express';

const app = express();

app.get('/',(req,res)=>{
    res.send("Hello SyncMeet!!");
});

app.listen(9000,() => {
    console.log("SyncMeet server running on 9000");
});