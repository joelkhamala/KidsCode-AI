import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const FriendDuel = ({ friends, invites, busy, onInvite, onAccept, onDecline }) => {
  const { t } = useTranslation();
  const [friendId, setFriendId] = useState('');

  useEffect(() => {
    if (!friends.some((f) => String(f.id) === friendId)) {
      setFriendId(friends.length ? String(friends[0].id) : '');
    }
  }, [friends, friendId]);

  return (
    <section className="card p-5 sm:p-7" aria-labelledby="arena-friends-title">
      <h2 id="arena-friends-title" className="font-display text-2xl text-slate-800">🤝 {t('duel.friendPlay')}</h2>
      <p className="text-sm font-semibold text-slate-500 mt-1">{t('duel.friendHelp')}</p>

      {friends.length ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); if (friendId) onInvite(Number(friendId)); }}
        >
          <div>
            <label htmlFor="duel-friend" className="block text-xs font-bold text-slate-600 mb-1">{t('duel.chooseFriend')}</label>
            <select
              id="duel-friend"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
            >
              {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={!friendId || busy}>{t('duel.inviteFriend')}</button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">{t('duel.noFriends')}</p>
      )}

      <h3 className="font-extrabold text-slate-800 mt-6 mb-2">{t('duel.invites')}</h3>
      {!invites.length && <p className="text-sm font-semibold text-slate-500">{t('duel.noInvites')}</p>}
      {!!invites.length && (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <span className="font-semibold text-slate-700">
                {t('duel.inviteFrom', {
                  name: invite.from.name,
                  mode: invite.mode.replace(/_/g, ' '),
                  difficulty: t(`duel.${invite.difficulty}`),
                })}
              </span>
              <span className="flex gap-2">
                <button type="button" className="btn-primary text-xs" disabled={busy} onClick={() => onAccept(invite.id)}>{t('duel.accept')}</button>
                <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => onDecline(invite.id)}>{t('duel.decline')}</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default FriendDuel;
