import AdaptationPlanView from '../components/AdaptationPlanView'

export default function MyDevelopment() {
  return (
    <AdaptationPlanView
      kind="development"
      title="Мой план развития"
      emptyText="План развития вам пока не назначен — обратитесь к руководителю."
    />
  )
}
