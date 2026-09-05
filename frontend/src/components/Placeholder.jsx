import PageHeader from './PageHeader'

export default function Placeholder({ kicker, title, description }) {
  return (
    <section>
      <PageHeader kicker={kicker} title={title} description={description} />
      <div className="placeholder-page">
        <span className="kicker">Bientôt disponible</span>
        <p>Ce module est en cours de construction et arrive prochainement.</p>
      </div>
    </section>
  )
}
