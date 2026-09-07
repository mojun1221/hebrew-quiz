import { firebaseConfig } from './firebase-config.js';

const configured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !String(firebaseConfig.apiKey).startsWith('YOUR_') &&
  firebaseConfig.projectId &&
  !String(firebaseConfig.projectId).startsWith('YOUR_');

if (!configured) {

  window.rankBackend = {
    isConfigured: false
  };

  window.dispatchEvent(
    new Event('rank-backend-ready')
  );

} else {

  const {
    initializeApp
  } = await import(
    'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'
  );

  const {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut: firebaseSignOut
  } = await import(
    'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'
  );

  const {
    getFirestore,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getCountFromServer
  } = await import(
    'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js'
  );

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const provider =
    new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: 'select_account'
  });

  const MAX_SCORE = 22125;
  const MAX_TIME_MS = 85000;

  function playerRef(uid) {
    return doc(db, 'rankPlayers', uid);
  }

  function normalizeNickname(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFKC');
  }

  function nicknameDocId(value) {
    return encodeURIComponent(
      normalizeNickname(value)
    );
  }

  async function signIn() {
    // 버튼 클릭에서 직접 호출되므로 popup 사용.
    // GitHub Pages에서도 별도 서버 없이 동작한다.
    await signInWithPopup(
      auth,
      provider
    );
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  function subscribeAuth(callback) {
    return onAuthStateChanged(
      auth,
      callback
    );
  }

  async function getMyProfile() {
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const snap =
      await getDoc(playerRef(user.uid));

    if (!snap.exists()) {
      return null;
    }

    return {
      uid: snap.id,
      ...snap.data()
    };
  }

  async function registerNickname(rawNickname) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'not-authenticated'
      );
    }

    const nickname =
      String(rawNickname).trim();

    if (!/^[가-힣A-Za-z0-9_]{2,12}$/.test(nickname)) {
      throw new Error(
        'invalid-nickname'
      );
    }

    const pRef =
      playerRef(user.uid);

    const nRef =
      doc(
        db,
        'rankNicknames',
        nicknameDocId(nickname)
      );

    await runTransaction(
      db,
      async transaction => {

        const profileSnap =
          await transaction.get(pRef);

        const nicknameSnap =
          await transaction.get(nRef);

        if (profileSnap.exists()) {
          const err =
            new Error('nickname-locked');

          err.code = 'nickname-locked';
          throw err;
        }

        if (nicknameSnap.exists()) {
          const err =
            new Error('nickname-taken');

          err.code = 'nickname-taken';
          throw err;
        }

        transaction.set(
          nRef,
          {
            uid: user.uid,
            nickname,
            createdAt: serverTimestamp()
          }
        );

        transaction.set(
          pRef,
          {
            uid: user.uid,
            nickname,
            bestScore: 0,
            bestCorrect: 0,
            bestTimeMs: 0,
            rankSortKey: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        );
      }
    );

    return getMyProfile();
  }

  async function submitScore(result) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'not-authenticated'
      );
    }

    const correct =
      Math.max(
        0,
        Math.min(
          25,
          Math.trunc(
            Number(result.correct) || 0
          )
        )
      );

    const timeMs =
      Math.max(
        0,
        Math.min(
          MAX_TIME_MS,
          Math.round(
            Number(result.timeMs) || 0
          )
        )
      );

    const score =
      Math.max(
        0,
        Math.min(
          MAX_SCORE,
          Math.round(
            Number(result.score) || 0
          )
        )
      );

    // 점수 우선, 동점이면 더 짧은 시간이 우선.
    // 단일 숫자 필드로 만들어 TOP 50 / 내 순위 쿼리를 단순화.
    const rankSortKey =
      score * 100000 +
      (MAX_TIME_MS - timeMs);

    const pRef =
      playerRef(user.uid);

    let isNewBest = false;

    await runTransaction(
      db,
      async transaction => {

        const snap =
          await transaction.get(pRef);

        if (!snap.exists()) {
          throw new Error(
            'profile-not-found'
          );
        }

        const current =
          snap.data();

        const currentKey =
          Number(
            current.rankSortKey || 0
          );

        if (rankSortKey > currentKey) {
          isNewBest = true;

          transaction.update(
            pRef,
            {
              bestScore: score,
              bestCorrect: correct,
              bestTimeMs: timeMs,
              rankSortKey,
              updatedAt: serverTimestamp()
            }
          );
        }
      }
    );

    const profile =
      await getMyProfile();

    if (
      profile &&
      Number(profile.bestScore || 0) > 0
    ) {
      profile.currentRank =
        await getMyRank(
          profile.rankSortKey
        );
    }

    return {
      isNewBest,
      profile
    };
  }

  async function getTop50() {
    const q =
      query(
        collection(db, 'rankPlayers'),
        where('rankSortKey', '>', 0),
        orderBy('rankSortKey', 'desc'),
        limit(50)
      );

    const snap =
      await getDocs(q);

    return snap.docs.map(
      document => ({
        uid: document.id,
        ...document.data()
      })
    );
  }

  async function getMyRank(rankSortKey) {
    const key =
      Number(rankSortKey || 0);

    if (!key) {
      return null;
    }

    const q =
      query(
        collection(db, 'rankPlayers'),
        where(
          'rankSortKey',
          '>',
          key
        )
      );

    const countSnap =
      await getCountFromServer(q);

    return (
      countSnap.data().count + 1
    );
  }

  window.rankBackend = {
    isConfigured: true,
    signIn,
    signOut,
    subscribeAuth,
    getMyProfile,
    registerNickname,
    submitScore,
    getTop50,
    getMyRank
  };

  window.dispatchEvent(
    new Event('rank-backend-ready')
  );
}
