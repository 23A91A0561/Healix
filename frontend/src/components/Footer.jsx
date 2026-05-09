import "../styles/components/Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div>
          <strong>Healix</strong>
          <p>Trusted digital care platform for modern healthcare teams.</p>
        </div>

        <div className="site-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
