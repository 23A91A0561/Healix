import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransitionLoader from '../components/PageTransitionLoader'
import './AmbulanceIntro.css'

export default function AmbulanceIntro() {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleGo = (e) => {
    e.preventDefault()
    setIsLoading(true)
    timerRef.current = window.setTimeout(() => {
      navigate('/login')
    }, 1400)
  }

  return (
    <div className="ambulance-intro-page">
      <div className="scene">
      <div className="sky-glow" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="road" />
      <div className="ground-shadow" />

      <div className="ambulance-wrap">
        <div className="ambulance" aria-label="ambulance animation">
          <div className="beacon" />
          <div className="cab" />
          <div className="box" />
          <div className="cross" />
          <div className="wheel left" />
          <div className="wheel right" />
        </div>
      </div>

      <div className="title-shell">
        <div className="title-card">
          <h1>Healix — The Future of Digital Healthcare</h1>
          <div className="subtext">Healthcare at Your Fingertips</div>
          <form className="login-form" onSubmit={handleGo}>
            <button type="submit" className="go-button" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Go'}
            </button>
          </form>
        </div>
      </div>

      <PageTransitionLoader
        visible={isLoading}
        title="Opening login page"
        subtitle="Page transition in progress"
      />
    </div>
    </div>
  )
}
