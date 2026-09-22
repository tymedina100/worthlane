type CoverageNotice = { accountId: string; message: string };

export function BankCoverageNotices({ notices }: { notices: CoverageNotice[] }) {
  if (notices.length === 0) return null;
  if (notices.length === 1) return <p className="status-banner" role="status">{notices[0].message}</p>;
  return (
    <details className="status-banner bank-coverage-notices">
      <summary>Bank data coverage · {notices.length} accounts</summary>
      <p>Balances and spending use the data available from each institution. Review freshness, history limits, and account-specific coverage below.</p>
      <ul>{notices.map(notice => <li key={notice.accountId}>{notice.message}</li>)}</ul>
    </details>
  );
}
