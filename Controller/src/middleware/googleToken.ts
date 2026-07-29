import express from 'express'
import { OAuth2Client } from 'google-auth-library'

const GoogleClient = process.env.VITE_GOOGLE_CLIENT_ID