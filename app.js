const express = require('express')
const app = express()

const globalErrorHandler = require('./utils/globalErrorHandler')

const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const xss = require('xss-clean')
const hpp = require('hpp')
const morgan = require('morgan')
const cors = require('cors')
const compression = require("compression")

const authRouter = require('./auth/auth-routes')

app.use(compression())
app.use(helmet())
app.use(cors())
app.use(express.json())


// API limiter
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: "Too many requests from this IP, please try again later"
})

app.use('/api', limiter)

// Login limiter 
const loginLimiter = rateLimit({
    max: 10,
    windowMs: 60 * 60 * 1000,
    message: "Too many login attempts, please try again later"
})
app.use('/api/auth/login', loginLimiter)


// XSS Attacks
app.use(xss())

// Parameter Pollution
app.use(hpp())


// Global Error Handling

//ROUTES

app.use('/api/auth', authRouter)

app.use(globalErrorHandler)

module.exports = app