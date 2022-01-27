const findRoom = (room, roomId) => {
    const r = room.find((obj) => {
        if (obj.roomId === roomId) {
            return obj;
        }
    });
    return r;
}
const getTime = () => {
    let data = new Date();
    let hours = data.getHours() % 12;
    let min = data.getMinutes() < 10 ? "0" + data.getMinutes() : data.getMinutes();
    let ampm = data.getHours >= 12 ? "am" : "pm";
    let currTime = hours + ":" + min + "" + ampm;
    return currTime;
}
const getUserAndRoom = (room, socketId) => {
    let user;
    const r = room.find((obj) => {
        for (let i = 0; i < obj.users.length; i++) {
            if (obj.users[i].socketId === socketId) {
                user = obj.users[i];
            }
        }
        if (user) {
            return obj;
        }
    });
    return { user: user, room: r }
}
module.exports = { findRoom, getTime, getUserAndRoom };