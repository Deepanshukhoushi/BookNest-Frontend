import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="about-container">
      <section class="hero-section">
        <h1 class="premium-title">The Booknest Archives</h1>
        <p class="mission-statement">Curation is an act of love. We believe that in a world of digital noise, the physical and digital archive of a book deserves a sacred space.</p>
      </section>

      <div class="story-grid">
        <div class="card card--glass story-card">
          <div class="icon">
            <span class="material-symbols-outlined">architecture</span>
          </div>
          <h3>Our Philosophy</h3>
          <p>Booknest was founded on the principle of 'The Intelligent Shelf'. We don't just sell books; we curate experiences that linger long after the final page is turned.</p>
        </div>

        <div class="card card--glass story-card">
          <div class="icon">
            <span class="material-symbols-outlined">history_edu</span>
          </div>
          <h3>The Aesthetic</h3>
          <p>From our glassmorphic interface to our typography selection, every pixel is designed to honor the literary tradition while embracing modern digital innovation.</p>
        </div>

        <div class="card card--glass story-card">
          <div class="icon">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <h3>The Community</h3>
          <p>A global network of readers, curators, and dreamers. Booknest is where the digital and physical archives of human thought find a harmonious home.</p>
        </div>
      </div>

      <section class="quote-section">
        <blockquote class="premium-quote">
          "A room without books is like a body without a soul."
          <cite>— Marcus Tullius Cicero</cite>
        </blockquote>
      </section>

      <section class="tech-stack card card--glass">
        <h3>The Engine</h3>
        <p>Built on a resilient microservices architecture (Auth, Order, Wallet, Notification), Booknest represents the pinnacle of modern software craftsmanship.</p>
      </section>
    </div>
  `,
  styles: [`
    .about-container {
      padding: 6rem var(--space-xl) var(--space-3xl);
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero-section {
      text-align: center;
      margin-bottom: var(--space-3xl);
    }
    .premium-title {
      font-family: var(--font-headline);
      font-size: var(--text-4xl);
      font-weight: 800;
      color: var(--color-primary);
      margin-bottom: var(--space-md);
    }
    .mission-statement {
      font-size: var(--text-lg);
      color: var(--text-secondary);
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
      font-weight: 400;
      font-style: italic;
      opacity: 0.8;
    }
    .story-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-xl);
      margin-bottom: var(--space-3xl);
    }
    .story-card {
      padding: var(--space-2xl);
      text-align: center;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-xl);
      transition: all var(--transition-base);
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: var(--shadow-lg);
    }
    .story-card:hover {
      transform: translateY(-8px);
      background: var(--color-primary-dark);
      box-shadow: var(--shadow-xl);
    }
    .story-card .icon {
      margin-bottom: var(--space-lg);
      color: rgba(255, 255, 255, 0.9);
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .story-card .icon .material-symbols-outlined {
      font-size: 2.25rem;
    }
    .story-card h3 {
      font-family: var(--font-headline);
      font-size: var(--text-xl);
      margin-bottom: var(--space-md);
      color: white;
      font-weight: 700;
    }
    .story-card p {
      color: rgba(255, 255, 255, 0.8);
      font-size: var(--text-sm);
      line-height: 1.6;
    }
    .quote-section {
      text-align: center;
      margin-bottom: var(--space-3xl);
      padding: var(--space-3xl) var(--space-xl);
      background-color: var(--neutral-100);
      border-radius: var(--radius-2xl);
    }
    .premium-quote {
      font-family: var(--font-headline);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-primary);
      margin: 0;
      line-height: 1.3;
    }
    .premium-quote cite {
      font-size: var(--text-base);
      color: var(--text-muted);
      display: block;
      margin-top: var(--space-lg);
      font-style: normal;
      font-weight: 600;
    }
    .tech-stack {
      text-align: center;
      padding: var(--space-3xl);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
    }
    .tech-stack h3 {
      font-family: var(--font-headline);
      font-size: var(--text-xl);
      margin-bottom: var(--space-md);
      color: var(--color-primary);
      font-weight: 700;
    }
    .tech-stack p {
      color: var(--text-secondary);
      font-size: var(--text-base);
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }

    @media (max-width: 900px) {
      .story-grid { grid-template-columns: 1fr; }
      .premium-title { font-size: var(--text-3xl); }
      .about-container { padding: var(--space-xl) var(--space-md); }
    }
  `]
})
export class AboutComponent {}
