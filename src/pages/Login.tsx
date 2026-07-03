import { signInWithGoogle } from '../lib/auth'

function Login() {
  return (
    <div className="login-screen">
      <h1>Planificateur de cours</h1>
      <p>Connecte-toi pour accéder à ton planning.</p>
      <button type="button" onClick={() => signInWithGoogle()}>
        Se connecter avec Google
      </button>
    </div>
  )
}

export default Login
