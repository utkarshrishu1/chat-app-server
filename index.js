const express = require('express');
const functions = require('./functions');
const cors = require('cors');
const http=require('http');
const app = express();
const socketio = require('socket.io');
app.use(express.json());
const server=http.createServer(app);
app.use(cors());
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        Credentials:true
    }
});
server.listen(process.env.PORT, () => {
    console.log("Server running!");
});
const room = [];
io.on("connection", (socket) => {
    socket.on("createRoom", (data) => {
        const r = functions.findRoom(room, data.roomId);
        if (r !== undefined) {
            socket.emit("createRoomError", { roomId: "Room Id Already Exist" });
        }
        else {
            socket.join(data.roomId);
            socket.emit("createdRoom", data.name);
            socket.emit("Notification", "Room Created");
            socket.emit("getRoomData", data.roomId);
            room.push({ roomId: data.roomId, admin: socket.id, roomName: data.roomName, users: [{ name: data.name, socketId: socket.id }] });
        }
    });
    socket.on("joinRoom", (data) => {
        const r = functions.findRoom(room, data.roomId);
        if (r === undefined) {
            socket.emit("joinRoomError", { roomId: "No Room with this Id found" });
        }
        else
            socket.to(r.admin).emit("permission", { ...data, socketId: socket.id });
    });
    socket.on("join", (data) => {
        const r = functions.findRoom(room, data.roomId);
        if (r === undefined) {
            socket.emit("joinRoomError", { roomId: "No Room with this Id found" });
        }
        else {
            socket.join(data.roomId);
            socket.emit("joinedRoom", data.name);
            r.users.push({ name: data.name, socketId: socket.id });
            socket.broadcast.to(data.roomId).emit("Notification", data.name + " Joined!");
            socket.broadcast.to(data.roomId).emit("getRoomData", r.roomId);
            socket.emit("Notification", "Welcome to " + r.roomName);
            socket.emit("getRoomData", r.roomId);
        }
    })
    socket.on("permissionReply", (reply) => {
        if (!reply.permission) {
            socket.to(reply.data.socketId).emit("joinRoomError", { alert: "Permission to Join Room Declined!" });
        }
        else {
            socket.to(reply.data.socketId).emit("permissionAllowed", reply.data);
        }
    });
    socket.on("sendMessage", (message) => {
        const data = functions.getUserAndRoom(room, socket.id);
        const user = data.user;
        const r = data.room;
        if (r) {
            const currTime = functions.getTime();
            socket.broadcast.to(r.roomId).emit("recieveMessage", { sender: user.name, message: message, time: currTime });
        }
        else {
            socket.emit("chatError", "Not Authenticated");
        }
    });
    socket.on("changeSocketId", (data) => {
        const roomData = JSON.parse(data.roomData);
        const name = data.name;
        const r = functions.findRoom(room, roomData.roomId);
        if (!r) {
            socket.join(roomData.roomId);
            room.push({ roomName: roomData.roomName, roomId: roomData.roomId, admin: socket.id, users: [{ name: name, socketId: socket.id }] });
            socket.broadcast.to(roomData.roomId).emit("Notification", name + " joined!");
            socket.emit("Notification", "Welcome to " + roomData.roomName);
        }
        else {
            socket.join(roomData.roomId);
            r.users.push({ name: name, socketId: socket.id });
            socket.broadcast.to(r.roomId).emit("Notification", name + " joined!");
            socket.emit("Notification", "Welcome to " + roomData.roomName);
        }
        socket.emit("getRoomData", roomData.roomId);
        socket.broadcast.to(roomData.roomId).emit("getRoomData", roomData.roomId);
    });
    socket.on("sendRoomData", (roomId) => {
        const r = functions.findRoom(room, roomId);
        socket.emit("roomData", { ...r, currentSocket: socket.id });
    })
    socket.on("disconnect", () => {
        const data = functions.getUserAndRoom(room, socket.id);
        const user = data.user;
        const r = data.room;
        if (r) {
            for (let i = 0; i < r.users.length; i++) {
                if (r.users[i].socketId === socket.id) {
                    r.users.splice(i, 1);
                    break;
                }
            }
            if (r.users.length === 0) {
                for (let i = 0; i < room.length; i++) {
                    if (r.roomId === room[i].roomId) {
                        room.splice(i, 1);
                        break;
                    }
                }
            }
            else if (r.admin === socket.id) {
                r.admin = r.users[0].socketId;
            }
            if (r.users.length !== 0) {
                socket.broadcast.to(r.roomId).emit("getRoomData", r.roomId);
                socket.broadcast.to(r.roomId).emit("Notification", user.name + " has Left!");
            }
        }
    });
})