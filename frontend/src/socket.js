import {API_URL} from './api.js';
import {io} from 'socket.io-client';

export const createSocket = (token) => io(API_URL, {auth : {token}, autoConnect: false});
