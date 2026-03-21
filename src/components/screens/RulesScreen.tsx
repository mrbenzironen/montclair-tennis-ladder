export function RulesScreen() {
  const sections = [
    {
      icon: '🎯', bg: '#f0f8d0', title: 'Challenges',
      rules: [
        { text: 'Challenge up to 10 spots above you', note: 'Wildcard extends this to 20 spots.', type: 'key' },
        { text: 'One active challenge at a time', note: 'One outgoing + one incoming simultaneously.', type: 'normal' },
        { text: '48 hours to accept or decline', note: 'No response = automatic forfeit win for the challenger.', type: 'normal' },
        { text: '14 days to play once accepted', note: 'If not played the challenge expires with no penalty.', type: 'normal' },
        { text: '8-day cooldown after each match', note: 'You must wait 8 days before re-challenging the same player.', type: 'normal' },
        { text: '2 consecutive forfeits = drop 10 spots', note: 'Each additional consecutive forfeit drops another 10 spots.', type: 'warn' },
      ],
    },
    {
      icon: '🎾', bg: '#f0f8d0', title: 'Scoring',
      rules: [
        { text: 'Default: 9-game pro set, win by 2', note: 'Tiebreaker at 8-8. Challenger brings balls. Venue is the challenged player\'s choice.', type: 'key' },
        { text: 'Alternate format by mutual agreement only', note: 'Two 6-game sets + 10-point super tiebreaker. Must be agreed before play begins.', type: 'normal' },
        { text: 'Winner reports score within 4 hours', note: 'Auto-confirmed after 2 hours if the loser doesn\'t respond.', type: 'normal' },
      ],
    },
    {
      icon: '🏆', bg: '#e8f0ff', title: 'Ranking',
      rules: [
        { text: 'Win: take the challenged player\'s exact spot', note: 'Challenged player drops one rung. Rankings update instantly once confirmed.', type: 'key' },
        { text: 'Loss: no position change', note: 'If the challenged player wins, rankings stay the same.', type: 'normal' },
      ],
    },
    {
      icon: '⚡', bg: '#fef9e0', title: 'Wildcards',
      rules: [
        { text: 'Earned after every 5 matches played', note: 'Forfeits don\'t count. Both Intermediate and Advanced ladders.', type: 'key' },
        { text: 'Wildcard range: up to 20 spots above', note: 'Double the standard 10-spot challenge range.', type: 'normal' },
        { text: 'No forfeit wins on wildcard challenges', note: 'If the match isn\'t played the challenge is cancelled. No ranking change.', type: 'warn' },
      ],
    },
    {
      icon: '💤', bg: '#fde8e8', title: 'Inactivity',
      rules: [
        { text: '21 days inactive: hidden from standings', note: 'You won\'t appear in the ladder and can\'t be challenged.', type: 'warn' },
        { text: 'Return: placed 10 spots below last position', note: 'After 42 days an additional 5-spot drop applies on return.', type: 'warn' },
        { text: '63 days: removed from ladder', note: 'Must re-register to rejoin.', type: 'warn' },
      ],
    },
    {
      icon: '✈️', bg: '#fff3e0', title: 'Temporary Leave',
      rules: [
        { text: 'Pause your spot anytime', note: 'Valid for vacation, injury, or work. Self-serve in the app — no admin needed.', type: 'key' },
        { text: 'Hidden from standings while on leave', note: 'You can\'t challenge or be challenged until you return.', type: 'normal' },
        { text: '5 spots dropped per full week on leave', note: 'Calculated automatically from your leave start date.', type: 'warn' },
      ],
    },
    {
      icon: '📍', bg: '#f0f8d0', title: 'New Player Placement',
      rules: [
        { text: 'All new players start at the bottom', note: 'Applies to both ladders and mid-season joiners. Earn your way up.', type: 'key' },
        { text: 'Admin may adjust any starting position', note: 'Based on known playing level or prior competition history.', type: 'normal' },
      ],
    },
    {
      icon: '🏅', bg: '#e8f0ff', title: 'Tournament',
      rules: [
        { text: 'Season runs April – end of September', note: 'Standings freeze at end of September to lock tier assignments.', type: 'key' },
        { text: 'October: 3-tier tournament', note: 'High, Medium, and Low tiers. Each tier runs its own bracket.', type: 'normal' },
        { text: '5 played matches required to qualify', note: 'Forfeits don\'t count. Must be played April–September.', type: 'warn' },
      ],
    },
    {
      icon: '🤝', bg: '#fde8ff', title: 'Spirit of the Game',
      rules: [
        { text: 'We play for fun', note: 'This ladder is about enjoying competitive tennis in our community. Winning matters, but so does having a good time.', type: 'key' },
        { text: 'Treat your Montclair neighbors with respect', note: 'Be punctual, be gracious in victory and defeat, and communicate clearly. These are your neighbors — act like it.', type: 'normal' },
        { text: 'Work it out directly', note: 'Disputes happen — sort them out in good faith. Contact Benzi only if you truly can\'t resolve it.', type: 'normal' },
      ],
    },
  ]

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      {/* Header */}
      <div style={{ background: '#201c1d', padding: '14px 20px 18px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>
          Ladder Rules
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, marginTop: 3 }}>
          Montclair Tennis Ladder · 2025 Season
        </div>
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        {sections.map(s => (
          <div key={s.title} style={{ margin: '14px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderBottom: '1.5px solid #f0ede8' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#201c1d' }}>
                {s.title}
              </div>
            </div>
            {s.rules.map((r, i) => (
              <div key={r.text} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: i < s.rules.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                  background: r.type === 'key' ? '#201c1d' : r.type === 'warn' ? '#e0914f' : '#c4e012',
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: r.type === 'key' ? 600 : 500, color: r.type === 'warn' ? '#7a3a10' : '#201c1d', lineHeight: 1.4 }}>
                    {r.text}
                  </div>
                  {r.note && (
                    <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 3, fontWeight: 300, lineHeight: 1.4 }}>
                      {r.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ padding: '16px', textAlign: 'center', fontSize: 11, color: '#aaa79f', fontWeight: 300 }}>
          Questions? Contact the admin: <strong style={{ color: '#201c1d' }}>Benzi</strong>
        </div>
      </div>
    </div>
  )
}
