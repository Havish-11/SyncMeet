import {Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';


export default function App(){
  return(
    <Routes>
      <Route path='*' element ={<Navigate to='/' replace/>}/>
    </Routes>
  )
}