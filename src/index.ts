import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 4000;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PairUp Backend Running");
});



const io = new Server(httpServer, {
  cors: {
    origin: "https://pairup-frontend.vercel.app",
  },
  transports: ["websocket"],
});
const waitingUsers: string[] = [];

io.on("connection",(socket) => {
    console.log("Client Connected", socket.id);
    socket.emit("server:welcome", {
        message:"connected to pairup real time",

    })

    socket.on("disconnect", () => {
        console.log("socket disconneted succesfully", socket.id);
    })

    socket.on("client:start_chat", () => {
        console.log("user wants to chat", socket.id);
        if(waitingUsers.length > 0){
            let partnerID = waitingUsers.shift();
            if(!partnerID || partnerID === socket.id){

                waitingUsers.push(socket.id);
                return;
            }

            const roomId = `room_${socket.id}_${partnerID}`

            socket.join(roomId);
            io.to(partnerID).socketsJoin(roomId);

            socket.emit("server:matched", { roomId, role: "caller" });
            io.to(partnerID).emit("server:matched", { roomId, role: "receiver" });



            console.log("matched:", socket.id,"with", partnerID);


        } else {
            waitingUsers.push(socket.id);
            console.log("added the user to the queue", socket.id);
        }
    })


    socket.on("client:send_message", ({ roomId, message}) => {
        console.log("Message:",message, "from",socket.id);


        io.to(roomId).emit("server:new_message", {
            sender: socket.id,
            message,
        })
    })

    socket.on("client:skip", ( {roomId }) => {
        console.log("user skipped", socket.id);
        socket.leave(roomId);
        
        socket.to(roomId).emit("server:partner_left");

        const index = waitingUsers.indexOf(socket.id);

        if(index !== -1){
            waitingUsers.splice(index,1);
        }

        waitingUsers.push(socket.id);

    })


    socket.on("webrtc:offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("webrtc:offer",{ offer, roomId});
    })

    socket.on("webrtc:answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("webrtc:answer",{ answer });
    })

    socket.on("webrtc:ice", ({ roomId, candidate }) => {
        socket.to(roomId).emit("webrtc:ice", { candidate });
    });






})



httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});



