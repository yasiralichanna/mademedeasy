'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Upload, Trash2, Check, X, Camera } from 'lucide-react';
import { api } from '../api';
import ConfirmDeletion from '../../components/ConfirmDeletion';
import { Head } from '../../components/Common';

export default function Profile({
  user,
  refresh,
  onDeleted,
}: {
  user: any;
  refresh: () => void;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [profile, setProfile] = useState<any>(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Profile photo state
  const [avatar, setAvatar] = useState<string>(user?.avatar || '');
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'student') {
      api('profiles/profile')
        .then(setProfile)
        .catch((e) => setMessage(e.message));
    }
  }, [user]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoMessage('Image file is too large. Please select an image under 8MB.');
      return;
    }

    setPhotoMessage('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Center crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setPreviewAvatar(dataUrl);
        setPhotoMessage('Preview ready. Click "Keep profile photo" to save.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be re-selected if desired
    e.target.value = '';
  }

  async function keepPhoto() {
    if (!previewAvatar) return;
    setSavingPhoto(true);
    setPhotoMessage('');
    try {
      await api('profiles/avatar', { avatar: previewAvatar });
      setAvatar(previewAvatar);
      setPreviewAvatar(null);
      setPhotoMessage('Profile photo saved successfully.');
      user.avatar = previewAvatar;
      refresh();
    } catch (err: any) {
      setPhotoMessage(err.message || 'Failed to save profile photo.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function deletePhoto() {
    setSavingPhoto(true);
    setPhotoMessage('');
    try {
      await api('profiles/avatar', { avatar: null });
      setAvatar('');
      setPreviewAvatar(null);
      setPhotoMessage('Profile photo deleted. Initials will be used.');
      user.avatar = null;
      refresh();
    } catch (err: any) {
      setPhotoMessage(err.message || 'Failed to delete profile photo.');
    } finally {
      setSavingPhoto(false);
    }
  }

  function cancelPreview() {
    setPreviewAvatar(null);
    setPhotoMessage('');
  }

  async function save(e: any) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      await api('profiles/profile', d);
      setProfile(await api('profiles/profile'));
      setMessage('Your enrollment details have been saved.');
      refresh();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api('profiles/delete', { password });
      setConfirmDelete(false);
      await onDeleted();
    } catch (e: any) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const currentPhoto = previewAvatar || avatar;

  return (
    <>
      <Head
        title={user?.role === 'admin' ? 'Administrator profile' : profile ? 'Your profile' : 'Complete your enrollment'}
        description="Manage your profile photo, personal information and settings."
      />

      {/* 1. Profile Photo Management Panel */}
      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <h3>Profile photo</h3>
          {previewAvatar ? (
            <span className="pill pending">PREVIEWING NEW PHOTO</span>
          ) : avatar ? (
            <span className="pill">CUSTOM PHOTO</span>
          ) : (
            <span className="pill expired">DEFAULT INITIALS</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar Preview Circle */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#e9f2f4',
              display: 'grid',
              placeItems: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--teal)',
              border: previewAvatar ? '3px solid var(--teal)' : '3px solid var(--line)',
              boxShadow: previewAvatar ? '0 0 0 4px #087c8025' : 'none',
              flexShrink: 0,
            }}
          >
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              user.name?.split(' ').map((s: string) => s[0]).slice(0, 2).join('') || 'U'
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="btn" style={{ margin: 0, cursor: 'pointer', display: 'inline-flex' }}>
                <Camera size={16} /> {avatar ? 'Change photo' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </label>

              {previewAvatar && (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={keepPhoto}
                    disabled={savingPhoto}
                  >
                    <Check size={16} /> {savingPhoto ? 'Saving…' : 'Keep profile photo'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={cancelPreview}
                    disabled={savingPhoto}
                  >
                    <X size={16} /> Cancel
                  </button>
                </>
              )}

              {avatar && !previewAvatar && (
                <button
                  type="button"
                  className="btn danger"
                  onClick={deletePhoto}
                  disabled={savingPhoto}
                >
                  <Trash2 size={16} /> {savingPhoto ? 'Deleting…' : 'Delete photo'}
                </button>
              )}
            </div>

            <small style={{ color: 'var(--muted)', display: 'block' }}>
              Supports JPG, PNG or WebP images. Photos are automatically cropped into a circular avatar.
            </small>
          </div>
        </div>

        {photoMessage && (
          <div
            className={`notice ${photoMessage.toLowerCase().includes('fail') || photoMessage.toLowerCase().includes('error') ? 'error' : ''}`}
            style={{ marginTop: 16 }}
            role="status"
          >
            {photoMessage}
          </div>
        )}
      </section>

      {/* 2. Student Enrollment Details (Students only) */}
      {user?.role === 'student' && (
        <div className="grid-two">
          <section className="panel">
            <div className="panel-head">
              <h3>Student details</h3>
              {profile && (
                <span className="pill">
                  <CheckCircle2 size={14} /> ENROLLED
                </span>
              )}
            </div>
            <form onSubmit={save} key={profile?.updated}>
              <div className="form-grid">
                <label>
                  Full name
                  <input value={user.name} readOnly />
                </label>
                <label>
                  Email address
                  <input value={user.email} readOnly />
                </label>
                <label className="full">
                  CNIC number
                  <input
                    name="cnic"
                    placeholder={profile ? 'Saved securely · ' + profile.cnic : 'XXXXX-XXXXXXX-X'}
                    required={!profile}
                    pattern="(?:[0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9])"
                  />
                  <div className="field-note">
                    {profile ? 'Leave blank to keep the saved CNIC.' : 'Enter 13 digits, with or without hyphens.'}
                  </div>
                </label>
                <label>
                  Medical college
                  <input
                    name="college"
                    defaultValue={profile?.college}
                    required
                    minLength={3}
                    placeholder="College or university name"
                  />
                </label>
                <label>
                  MBBS year <span style={{ color: 'var(--red)' }}>*</span>
                  <select name="year" defaultValue={profile?.year ? String(profile.year) : '4'} required>
                    <option value="" disabled>Select MBBS year</option>
                    <option value="1" disabled>Year 1 (Inactive / Coming soon)</option>
                    <option value="2" disabled>Year 2 (Inactive / Coming soon)</option>
                    <option value="3" disabled>Year 3 (Inactive / Coming soon)</option>
                    <option value="4">Year 4 (Active)</option>
                    <option value="5" disabled>Year 5 (Inactive / Coming soon)</option>
                  </select>
                  <div className="field-note">
                    Year selection is compulsory. Only 4th Year MBBS is currently active; other years are deactivated for now.
                  </div>
                </label>
              </div>
              {message && (
                <div className="notice" role="status">
                  {message}
                </div>
              )}
              <div className="form-actions">
                <button className="btn primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save enrollment'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel" style={{ alignSelf: 'start' }}>
            <ShieldCheck color="var(--teal)" size={28} />
            <h3 style={{ margin: '14px 0 10px' }}>Your information stays private</h3>
            <p className="subtitle">
              CNIC is collected to identify your enrollment and match it with your payment review. It is encrypted and
              masked by default.
            </p>
            <p className="subtitle">
              This does not verify your identity with any government service. Only authorized administrators can view the
              full number, with an audit record.
            </p>
          </section>
        </div>
      )}

      {/* 3. Administrator Details (Admins only) */}
      {user?.role === 'admin' && (
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h3>Administrator Account</h3>
            <span className="pill">ADMINISTRATOR</span>
          </div>
          <div className="form-grid">
            <label>
              Full name
              <input value={user.name} readOnly />
            </label>
            <label>
              Email address
              <input value={user.email} readOnly />
            </label>
            <label>
              Role
              <input value="System Administrator" readOnly />
            </label>
            <label>
              Mobile number
              <input value={user.mobile || 'Not set'} readOnly />
            </label>
          </div>
        </section>
      )}

      {/* 4. Delete Account (Students only) */}
      {user?.role === 'student' && (
        <section className="panel" style={{ marginTop: 24, borderColor: '#dc2626' }}>
          <h3>Delete account</h3>
          <p className="subtitle">
            Permanently remove your account, enrollment, payment records and receipts, subscriptions, bookmarks and
            practice/exam history. This cannot be undone.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDeleteError('');
              setConfirmDelete(true);
            }}
          >
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {deleteError && (
              <div className="notice error" role="alert">
                {deleteError}
              </div>
            )}
            <button
              className="btn"
              type="submit"
              disabled={deleting || !password}
              style={{ marginTop: 16, color: '#b91c1c', borderColor: '#dc2626' }}
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </form>
        </section>
      )}

      {confirmDelete && (
        <ConfirmDeletion
          title="Delete your account?"
          description="Your account, enrollment, payment records and receipts, subscriptions, bookmarks and practice/exam history will be permanently deleted."
          label="Yes, delete my account"
          busy={deleting}
          error={deleteError}
          cancel={() => setConfirmDelete(false)}
          confirm={deleteAccount}
        />
      )}
    </>
  );
}
