import "../App.css";
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LandingPage() {
    const router = useNavigate();

    const joinAsGuest = () => {
        const randomCode = Math.random().toString(36).substring(2, 9);
        router(`/${randomCode}`);
    };

    // simple scroll reveal
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('reveal-visible');
                    }
                });
            },
            { threshold: 0.2 }
        );
        document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className='landingPageContainer'>
            <nav className='landingNav glassyNav'>
                <div className='navHeader'>
                    <a href='/' aria-label='Panelly Home'>
                        <img src='/panelly_logo.png' alt='Panelly Logo' className='logo' />
                    </a>
                </div>
                <div className='navlist'>
                    <button className='navBtn subtle' onClick={joinAsGuest}>Join as Guest</button>
                    <button className='navBtn subtle' onClick={() => router('/auth')}>Register</button>
                    <button className='navBtn primary' onClick={() => router('/auth')}>Login</button>
                </div>
            </nav>

            <div className='heroSection'>
                <div className='heroCopy' data-reveal>
                    <h1 className='heroTitle'>
                        <span className='gradientWord'>Connect</span> & Collaborate <br /> with the world
                    </h1>
                    <p className='heroSubtitle'>Crystal clear video calls, real‑time chat & effortless screen sharing — all in one lightweight experience.</p>
                    <div className='heroActions'>
                        <Link to='/auth' className='ctaBtn'>Get Started</Link>
                        <button className='ghostBtn' onClick={joinAsGuest}>Quick Join</button>
                    </div>
                    <div className='miniStats'>
                        <div><span className='statNumber'>1K+</span><span className='statLabel'>Meetings Hosted</span></div>
                        <div><span className='statNumber'>99.9%</span><span className='statLabel'>Uptime</span></div>
                        <div><span className='statNumber'>220ms</span><span className='statLabel'>Avg Latency</span></div>
                    </div>
                </div>
                <div className='heroVisual' data-reveal>
                    <div className='floatingMockup'>
                        <img src='/mobile.png' alt='App preview' className='mockupImg' />
                        <div className='pulseDot one'></div>
                        <div className='pulseDot two'></div>
                        <div className='pulseDot three'></div>
                    </div>
                </div>
            </div>

            <section className='featuresSection'>
                <div className='featuresGrid'>
                    <div className='featureCard' data-reveal>
                        <h3>Instant Meetings</h3>
                        <p>Spin up a secure room in seconds and share the link — no installs required.</p>
                    </div>
                    <div className='featureCard' data-reveal>
                        <h3>Low Latency</h3>
                        <p>Optimized WebRTC connections keep audio & video crisp even on slower networks.</p>
                    </div>
                        <div className='featureCard' data-reveal>
                        <h3>Screen Share</h3>
                        <p>Present designs, slides or code with fluid HD screen sharing.</p>
                    </div>
                    <div className='featureCard' data-reveal>
                        <h3>Chat Built-In</h3>
                        <p>Side‑by‑side text chat keeps everyone aligned without context switching.</p>
                    </div>
                </div>
            </section>

            <footer className='landingFooter'>
                <p>© {new Date().getFullYear()} Panelly. Crafted for seamless human connection.</p>
            </footer>
        </div>
    );
}
