// src/components/Footer.jsx
import React from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  
  // Logic to clear service workers and cache storage
  const handleClearCache = async () => {
    if (window.confirm('This will refresh the app and clear local caches to fix loading issues. Continue?')) {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }

        window.location.reload();
      } catch (e) {
        console.error("Cache clear failed", e);
        window.location.reload();
      }
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        {/* Brand / Project */}
        <div className={styles.brandBlock}>
          <img
            src="/img/ATT-logo(1).png"
            alt="Erebus Hunt"
            className={styles.attLogo}
            draggable="false"
          />
          <div className={styles.brandText}>
            {/* CHANGED: Erebus Portal -> Erebus Hunt */}
            <div className={styles.title}>Erebus Hunt</div>
            <div className={styles.byline}>
              made by <a href="https://miketsak.gr" target="_blank" rel="noreferrer">MikeTsak</a> for the
              {' '}Athens Through-Time LARP — Powered by{' '}
              <a href="https://cerebralproductions.eu/" target="_blank" rel="noreferrer">Cerebral Productions</a>
            </div>
          </div>
        </div>

        {/* Logos & Legal */}
        <div className={styles.logosBlock}>
          <a
            href="https://cerebralproductions.eu/"
            target="_blank"
            rel="noreferrer"
            className={styles.partnerLink}
            aria-label="Cerebral Productions"
          >
            <img
              src="/img/cerebralproductions.png"
              alt="Cerebral Productions"
              className={styles.partnerLogo}
              draggable="false"
            />
          </a>

          <a
            href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement"
            target="_blank"
            rel="noreferrer"
            className={styles.dpLink}
            aria-label="Dark Pack Agreement"
          >
            <img
              src="/img/DarkPack_Logo2.png"
              alt="World of Darkness — Dark Pack"
              className={styles.darkPackLogo}
              draggable="false"
            />
          </a>
        </div>
      </div>

      {/* Legal text */}
      <div className={styles.legalLines}>
        <small className={styles.legal}>
          Portions of the materials are the copyrights and trademarks of Paradox Interactive AB,
          and are used with permission. All rights reserved. For more information please visit
          {' '}<a href="https://www.worldofdarkness.com" target="_blank" rel="noreferrer">worldofdarkness.com</a>.
        </small>
        <small className={styles.legalMuted}>
          This is <b>unofficial fan content</b> and is not approved, endorsed, or affiliated with Paradox Interactive.
        </small>
        <small className={styles.legalMuted}>
          Vampire: The Masquerade and World of Darkness are trademarks of Paradox Interactive AB.
        </small>
      </div>

      <div className={styles.linksRow}>
        {/* CHANGED: Swapped <Link> to <a> to point back to the main portal */}
        <a href="https://portal.attlarp.gr/terms" className={styles.footerLink}>
          Terms
        </a>
        <a href="https://portal.attlarp.gr/privacy" className={styles.footerLink}>
          Privacy
        </a>
        <a href="https://portal.attlarp.gr/legal" className={styles.footerLink}>
          Legal
        </a>
        <a
          href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement"
          target="_blank"
          rel="noreferrer"
          className={styles.footerLink}
        >
          Dark Pack
        </a>
        
        <button 
          type="button" 
          onClick={handleClearCache} 
          className={styles.footerLink}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
        >
          Clear Cache
        </button>
      </div>
    </footer>
  );
}