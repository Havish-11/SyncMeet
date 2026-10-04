import {Navigate} from 'react-router-dom';
import {useAuth} from './AuthContext.jsx';

export default function ProtectedRoute({children}){ //prevent users from accessing pages unless they are logged in
    const {user,loading} = useAuth();

    if(loading) return <p className="center">Loading...</p>;
    return user? children: <Navigate to ="/login" replace/>;
}