const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom}=require('./utils/users')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))
io.on('connection', (socket) => {
    console.log('New WebSocket connection')
   //When a user joins a room
    socket.on('join',({username,room},callback)=>{
      const {error,user}=addUser({id:socket.id,username:username,room:room})
      if(error)
      {
          return callback(error)
      }
      socket.join(user.room)
      socket.emit('message', generateMessage('Welcome!'))
      socket.broadcast.to(user.room).emit('message', generateMessage(user.username,`${user.username} has joined ${user.room}`))
      io.to(user.room).emit('roomData',{
          room:user.room,
          userlist:getUsersInRoom(room)
      })
      callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        const user=getUser(socket.id)
        const room =user.room
        io.to(room).emit('message', generateMessage(user.username,message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user=getUser(socket.id)
        const room =user.room
        io.to(room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user=removeUser(socket.id)
        if(user)
        {   
            io.to(user.room).emit('message', generateMessage(user.username,`${user.username} has left the chat `))
            io.to(user.room).emit('roomData',{
                room:user.room,
                userlist:getUsersInRoom(user.room)
            })
   
        }
         })
    
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
}) 