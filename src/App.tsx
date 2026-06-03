import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ThumbsUp,
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  Calendar,
  Award,
  Upload,
  Info,
  ChevronRight,
  Heart,
  TrendingUp,
  History,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WatermelonRecord, WatermelonStatus, MarketIndex, CityStat } from './types';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { SquareFeed } from './components/SquareFeed';
import { PriceChart } from './components/PriceChart';
import { gameAudio } from './utils/audioSynth';
import { drawWatermelonToCanvas, getWatermelonImageURL, getSlicedWatermelonImageURL } from './utils/watermelonDrawer';
import { MODERATION_POLICY } from './utils/moderationPolicy';
import { useModeration, checkContent } from './utils/moderationApi';
import { detectWatermelonFromCanvas } from './utils/watermelonDetector';
import { convertToPixelArt } from './utils/pixelArtConverter';

// Seed community data
const DEFAULT_COMMUNITY_MELONS: WatermelonRecord[] = [
  {
    id: 'seed-1',
    name: '王大爷挑的梦中情瓜',
    soundScore: 95,
    lookScore: 98,
    overallScore: 96,
    frequency: 125,
    stripeContrast: 0.9,
    greenness: 0.75,
    ripenessStatus: 'ripe',
    ratedStars: 5,
    message: '老伴夸我会挑瓜！敲起来咚咚响，一刀下去汁水四溅，甜到心里去了～夏天就该这样！🍉',
    timestamp: Date.now() - 3600000 * 4,
    photoUrl: '',
    likes: 238,
    whatsUp: 15,
    priceDisputes: 2,
    location: '📍 北京·庞各庄的甜甜瓜田',
    mood: '❤️ 元气脆甜心情',
    pricePerJin: 2.5,
    isSelfSplit: true,
    purchaseLocation: '庞各庄路边瓜摊'
  },
  {
    id: 'seed-2',
    name: '室友手滑挑到的白瓤小可怜',
    soundScore: 20,
    lookScore: 35,
    overallScore: 26,
    frequency: 310,
    stripeContrast: 0.35,
    greenness: 0.4,
    ripenessStatus: 'unripe',
    ratedStars: 1,
    message: '水果摊上被颜值迷惑了！敲起来像塑料瓶，切开白白的连籽都没有……酸得我龇牙咧嘴，翻车现场！😭',
    timestamp: Date.now() - 3600000 * 12,
    photoUrl: '',
    likes: 182,
    whatsUp: 42,
    priceDisputes: 5,
    location: '📍 隔壁超市特价区·避坑现场',
    mood: '🟢 青涩迷茫心境',
    pricePerJin: 1.8,
    isSelfSplit: true,
    purchaseLocation: '永辉超市特价区'
  },
  {
    id: 'seed-3',
    name: '外卖盲盒开出的沙瓤惊喜',
    soundScore: 88,
    lookScore: 90,
    overallScore: 89,
    frequency: 85,
    stripeContrast: 0.8,
    greenness: 0.65,
    ripenessStatus: 'overripe',
    ratedStars: 4,
    message: '本来担心熟过了，结果切开一尝——哇！沙沙的口感超绝，冰镇一晚上甜到嗓子眼，简直是西瓜冰淇淋！🍦',
    timestamp: Date.now() - 3600000 * 24,
    photoUrl: '',
    likes: 165,
    whatsUp: 8,
    priceDisputes: 1,
    location: '📍 新疆·哈密葡萄沙地的甜甜瓜田',
    mood: '🧘 佛系看淡心境',
    pricePerJin: 1.5,
    isSelfSplit: false,
    purchaseLocation: '美团外卖盲盒'
  }
];

export default function App() {
  // --- States ---
  const [records, setRecords] = useState<WatermelonRecord[]>([]);
  const [activeSegment, setActiveSegment] = useState<'scan' | 'community'>('scan');

  // Scanning Sub-States
  const [useRealMic, setUseRealMic] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [useRealCamera, setUseRealCamera] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isDetectingWatermelon, setIsDetectingWatermelon] = useState<boolean>(false);
  // 5秒自动停止倒计时
  const [micCountdown, setMicCountdown] = useState<number>(0);
  const [camCountdown, setCamCountdown] = useState<number>(0);

  // Audio Context refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const listenIntervalRef = useRef<number | null>(null);
  const hasCapturedRef = useRef<boolean>(false);

  // Camera & Video refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic values parsed during testing
  const [detectedFrequency, setDetectedFrequency] = useState<number>(0);
  const [avgFrequency, setAvgFrequency] = useState<number>(0);
  const [detectedContrast, setDetectedContrast] = useState<number>(0);
  const [detectedGreenness, setDetectedGreenness] = useState<number>(0);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');

  // Selected testing preset (for testing simulator Fallbacks)
  const [waterMelonPreset, setWaterMelonPreset] = useState<WatermelonStatus>('ripe');

  // Score states
  const [calculatedScore, setCalculatedScore] = useState<number>(0);
  const [testResultStatus, setTestResultStatus] = useState<WatermelonStatus>('ripe');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [testDone, setTestDone] = useState<boolean>(false);

  // Form custom share inputs
  const [customMelonName, setCustomMelonName] = useState<string>('超级清爽甜甜瓜');
  const [customComment, setCustomComment] = useState<string>('这瓜绝了！敲出来声音很正，条纹清晰，甜度拉满，吃一口直接给夏天续命！');
  const [customStars, setCustomStars] = useState<number>(5);
  const [customLocation, setCustomLocation] = useState<string>('📍 新疆哈密葡萄沙地');
  const [isFetchingLocation, setIsFetchingLocation] = useState<boolean>(false);
  // 华强买瓜：价格行情
  const [customPrice, setCustomPrice] = useState<string>('');
  const [isSelfSplit, setIsSelfSplit] = useState<boolean>(false);
  const [purchaseLocation, setPurchaseLocation] = useState<string>('');
  const [marketIndex, setMarketIndex] = useState<MarketIndex | null>(null);
  const [showMarketPanel, setShowMarketPanel] = useState<boolean>(true);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);

  // Cooldown & Melon Client Passport states (Anti-Spam security)
  const [melonPassport, setMelonPassport] = useState<string>('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [nextResetTime, setNextResetTime] = useState<number>(0);
  const [resetCountdown, setResetCountdown] = useState<string>('');
  const [showRules, setShowRules] = useState<boolean>(false);

  // AI moderation hook (at component top-level for React rules of hooks)
  const previewText = `${customMelonName} ${customComment}`.trim();
  const previewModeration = useModeration(previewText, 600);

  // Countdown timer for posting cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // 1-second tick for daily reset countdown
  useEffect(() => {
    if (nextResetTime <= 0) return;
    const tick = () => {
      const ms = nextResetTime - Date.now();
      if (ms <= 0) {
        setResetCountdown('00:00:00');
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setResetCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextResetTime]);

  // 麦克风 5 秒自动停止
  useEffect(() => {
    if (!isListeningMic || micCountdown <= 0) return;
    const id = setTimeout(() => {
      if (micCountdown <= 1) {
        stopMicrophone();
      } else {
        setMicCountdown(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [isListeningMic, micCountdown]);

  const handleAutoGetLocation = () => {
    if (!navigator.geolocation) {
      alert('⚠️ 哎呀，你的浏览器不支持定位功能～已帮你挑了一个甜甜的瓜地！🍉');
      return;
    }

    setIsFetchingLocation(true);
    gameAudio.playPop();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode to city name (free OSM Nominatim, no API key needed)
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=zh`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || geoData.address?.state || '';
            const province = geoData.address?.state || geoData.address?.province || '';
            const cityName = city || province || '';
            const locationName = city
              ? `📍 ${province ? province.replace(/省|市$/, '') + '·' : ''}${city}的甜甜瓜田`
              : `📍 北纬${latitude.toFixed(1)}°附近的秘密瓜地`;
            setCustomLocation(locationName);
            // 华强买瓜：自动填入城市作为购买地
            if (cityName && !purchaseLocation) {
              setPurchaseLocation(cityName);
            }
            setIsFetchingLocation(false);
            return;
          }
        } catch (geoErr) {
          console.warn('[Geo] 反向地理编码失败，使用模糊坐标:', geoErr);
        }
        // Fallback: fuzzy coordinates
        const fuzzyLocStr = `📍 北纬${latitude.toFixed(1)}°附近的秘密瓜地`;
        setCustomLocation(fuzzyLocStr);
        setIsFetchingLocation(false);
      },
      (error) => {
        console.error('Error getting location', error);
        setIsFetchingLocation(false);
        let errorMsg = '定位好像出了点小问题～';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = '你害羞地拒绝了定位邀请～';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = '天空云层太厚，暂时找不到你的瓜地～';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = '定位小精灵跑得有点慢～';
        }
        alert(`💫 ${errorMsg} 已经帮你选了一个甜甜的夏日瓜地！`);
        setCustomLocation('📍 新疆哈密·葡萄沙地的甜甜瓜田');
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  // Decorative loaded slice
  const [slicedMelonIcon, setSlicedMelonIcon] = useState<string>('');

  // --- Initialize Seed Data on Mount ---
  useEffect(() => {
    // Generate slice
    setSlicedMelonIcon(getSlicedWatermelonImageURL());

    // Generate or fetch Melon Passport (设备指纹 + localStorage 双保险)
    let passport = localStorage.getItem('melon_passport_id');
    if (!passport) {
      // 设备指纹：跨浏览器也能保持一致的 ID
      const fp = [
        navigator.platform || 'unknown',
        screen.width, screen.height, screen.colorDepth,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      ].join('|');
      // 简单哈希 → 4 位 hex
      let hash = 0;
      for (let i = 0; i < fp.length; i++) {
        hash = ((hash << 5) - hash) + fp.charCodeAt(i);
        hash |= 0;
      }
      const fpCode = Math.abs(hash % 10000).toString().padStart(4, '0');

      const suffixes = ['吃瓜群众', '庞各庄沙瓤派', '冰镇碎碎冰尊者', '哈密沙漠瓜侠', '白瓤西瓜避坑王', '五彩甜雪糕使者', '消暑科学鉴瓜师'];
      // 同一设备始终选同一个后缀
      const suffixIdx = Math.abs(hash % suffixes.length);
      passport = `🍉 ${suffixes[suffixIdx]}_#${fpCode}`;
      localStorage.setItem('melon_passport_id', passport);
    }
    setMelonPassport(passport);

    // Initial Cooldown checks
    const cooldownEnd = localStorage.getItem('melon_cooldown_ends_at');
    if (cooldownEnd) {
      const remaining = Math.ceil((parseInt(cooldownEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      }
    }

    const saved = localStorage.getItem('melon_masters_records');

    // --- "不吃隔夜瓜" — 每日凌晨1:00清除当日晒瓜数据 ---
    const getTodayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const lastResetDate = localStorage.getItem('melon_last_reset_date');
    const todayStr = getTodayStr();
    const today1AM = new Date();
    today1AM.setHours(1, 0, 0, 0);

    // 如果已过今日凌晨1点且还没重置过，或从未重置过（首次）
    let forceReset = false;
    if (Date.now() >= today1AM.getTime() && lastResetDate !== todayStr) {
      forceReset = true;
      localStorage.setItem('melon_last_reset_date', todayStr);
    }

    // Step 1: Load from localStorage first (instant UI)
    if (saved && !forceReset) {
      try {
        setRecords(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    } else {
      // Reset — seed with fresh daily data
      const fullySeeded = DEFAULT_COMMUNITY_MELONS.map(m => ({
        ...m,
        photoUrl: getWatermelonImageURL(m.ripenessStatus, m.name)
      }));
      setRecords(fullySeeded);
      localStorage.setItem('melon_masters_records', JSON.stringify(fullySeeded));
    }

    // Step 2: Fetch server records (source of truth, overrides localStorage)
    const syncFromServer = async () => {
      try {
        const res = await fetch('/chigua-api/records?limit=200');
        if (res.ok) {
          const data = await res.json();
          if (data.records && data.records.length > 0) {
            setRecords(data.records);
            localStorage.setItem('melon_masters_records', JSON.stringify(data.records));
          } else {
            // Server has no records (new day!) — seed with defaults
            const seeded = DEFAULT_COMMUNITY_MELONS.map(m => ({
              ...m,
              photoUrl: getWatermelonImageURL(m.ripenessStatus, m.name)
            }));
            setRecords(seeded);
            localStorage.setItem('melon_masters_records', JSON.stringify(seeded));
          }
        }
      } catch (err) {
        console.warn('[Sync] 服务器同步失败，使用本地数据:', err);
      }
    };
    syncFromServer();
    fetchMarketIndex();

    // Calculate ms until next 1:00 AM for the auto-reset timer
    const next1AM = new Date();
    next1AM.setDate(next1AM.getDate() + 1);
    next1AM.setHours(1, 0, 0, 0);
    const msUntilNext1AM = next1AM.getTime() - Date.now();

    setNextResetTime(next1AM.getTime());

    const resetTimer = setTimeout(() => {
      // Re-fetch from server after reset; seed locally as fallback
      const seeded = DEFAULT_COMMUNITY_MELONS.map(m => ({
        ...m,
        photoUrl: getWatermelonImageURL(m.ripenessStatus, m.name)
      }));
      setRecords(seeded);
      localStorage.setItem('melon_masters_records', JSON.stringify(seeded));
      const newDateStr = getTodayStr();
      localStorage.setItem('melon_last_reset_date', newDateStr);
      // Schedule next 1AM
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(1, 0, 0, 0);
      setNextResetTime(next.getTime());
      // Also try to sync from server
      syncFromServer();
    }, msUntilNext1AM);

    return () => clearTimeout(resetTimer);
  }, []);

  // 华强买瓜：获取今日行情看板
  const fetchMarketIndex = async () => {
    try {
      const res = await fetch('/chigua-api/market-index');
      if (res.ok) {
        const data = await res.json();
        setMarketIndex(data);
      }
    } catch (err) {
      console.warn('[Market] 行情获取失败:', err);
    }
  };

  // 华强语气改写
  const handleHuaqiangRewrite = async () => {
    if (!customComment.trim()) return;
    setIsRewriting(true);
    try {
      const res = await fetch('/chigua-api/huaqiang-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shared-secret': import.meta.env.VITE_SHARED_SECRET || '' },
        body: JSON.stringify({ text: customComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rewritten && data.rewritten !== customComment.trim()) {
          setCustomComment(data.rewritten);
          gameAudio.playPop();
        }
      }
    } catch (err) {
      console.warn('[Huaqiang] 改写失败:', err);
    }
    setIsRewriting(false);
  };

  // Sync state to local storage + server when changed
  const saveRecordsToStorage = (newRecords: WatermelonRecord[], newRecord?: WatermelonRecord) => {
    setRecords(newRecords);
    localStorage.setItem('melon_masters_records', JSON.stringify(newRecords));
    // Also POST new record to server for shared community feed
    if (newRecord) {
      fetch('/chigua-api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(err => console.warn('[Sync] 发布同步服务器失败:', err));
    }
  };

  // --- Draw the procedural watermelon inside the scan panel ---
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas && !isCameraActive && !capturedPhotoUrl) {
      drawWatermelonToCanvas(canvas, waterMelonPreset, {
        showFace: true,
        nameTag: waterMelonPreset === 'unripe' ? '小生瓜 (铛铛)' : waterMelonPreset === 'ripe' ? '甜沙瓤 (咚咚)' : '熟透瓜 (噗噗)'
      });
    }
  }, [waterMelonPreset, isCameraActive, capturedPhotoUrl]);

  // --- Real Microphone Analyzer Handler ---
  const toggleMicrophone = async () => {
    if (isListeningMic) {
      // Turn off
      setMicCountdown(0);
      stopMicrophone();
    } else {
      // Turn on
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyserRef.current = analyser;

        setIsListeningMic(true);
        setUseRealMic(true);
        setMicCountdown(5);  // 5 秒后自动停止
        hasCapturedRef.current = false;
        gameAudio.playPop();

        // Listen for rhythmic sound wave energy peaks (Auto-tapping detection)
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let lastVolumeAvg = 0;
        let tapCooldown = 0;

        const checkTap = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArray);

          // Calculate Root Mean Square volume (average volume magnitude)
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const dev = (dataArray[i] / 128.0) - 1.0;
            sum += dev * dev;
          }
          const rms = Math.sqrt(sum / bufferLength);

          // Simple dynamic thresholding to detect a quick thump peak
          const threshold = Math.max(0.04, lastVolumeAvg * 2.8);
          if (rms > threshold && tapCooldown <= 0) {
            // TAP DETECTED! Find peak frequency
            const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(freqData);

            // Find frequency bin with maximum energy
            let maxVal = -1;
            let peakIndex = -1;
            for (let i = 0; i < freqData.length; i++) {
              if (freqData[i] > maxVal) {
                maxVal = freqData[i];
                peakIndex = i;
              }
            }

            // Convert bin index to actual frequency (Hz)
            const sampleRate = audioCtx.sampleRate;
            let peakFreq = Math.round((peakIndex * sampleRate) / (analyser.fftSize));
            
            // Limit to logical physical watermelon range to filter background noise
            if (peakFreq > 40 && peakFreq < 400) {
              setDetectedFrequency(peakFreq);
              hasCapturedRef.current = true;
              // Trigger a tactile success synthesis tap sound to match!
              let statusMatch: WatermelonStatus = 'ripe';
              if (peakFreq > 180) statusMatch = 'unripe';
              else if (peakFreq < 90) statusMatch = 'overripe';
              
              gameAudio.playWatermelonTap(statusMatch);
              tapCooldown = 15; // Cool down frame cycles (about 300ms)
            }
          }

          // Smooth running average of standard ambient sound volume to adapt to room noise
          lastVolumeAvg = lastVolumeAvg * 0.95 + rms * 0.05;
          if (tapCooldown > 0) tapCooldown--;

          // Fix React state package closure bug by checking analyserRef.current instead of isListeningMic
          if (analyserRef.current) {
            listenIntervalRef.current = requestAnimationFrame(checkTap);
          }
        };

        listenIntervalRef.current = requestAnimationFrame(checkTap);

      } catch (err) {
        console.warn('Microphone permission or hardware issue:', err);
        alert('哎呀，麦克风好像没准备好～没关系！已帮你切到"拍拍模拟器"模式，点按钮就能听到瓜瓜的声音，一样好玩哦！🎵');
        setUseRealMic(false);
      }
    }
  };

  const stopMicrophone = () => {
    setMicCountdown(0);
    if (listenIntervalRef.current) {
      cancelAnimationFrame(listenIntervalRef.current);
      listenIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setIsListeningMic(false);
    analyserRef.current = null;

    // Fallback: If user clicked stop listening and no frequency thump was registered yet,
    // we generate a sweet acoustic physical frequency matching their active visual preset.
    if (!hasCapturedRef.current) {
      let fallbackFreq = 125;
      if (waterMelonPreset === 'unripe') fallbackFreq = 265;
      else if (waterMelonPreset === 'overripe') fallbackFreq = 74;
      setDetectedFrequency(fallbackFreq);
      gameAudio.playWatermelonTap(waterMelonPreset);
    }
  };

  // Turn off streams when switching pages
  useEffect(() => {
    return () => {
      stopMicrophone();
      stopCamera();
    };
  }, []);

  // Attach camera stream to video element once it renders
  useEffect(() => {
    if (isCameraActive && localStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = localStreamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play()?.catch(err => console.warn('Video play failed:', err));
      };
    }
  }, [isCameraActive]);

  // --- Real Camera Stream Handlers ---
  const toggleCamera = async () => {
    if (isCameraActive) {
      setCamCountdown(0);
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 400 },
            height: { ideal: 400 },
            facingMode: { ideal: 'environment' }
          }
        });
        localStreamRef.current = stream;
        setIsCameraActive(true);
        setUseRealCamera(true);
        setCamCountdown(5);  // 5 秒后自动停止
        setCapturedPhotoUrl('');
        gameAudio.playPop();
      } catch (err) {
        console.warn('Camera failed:', err);
        alert('哎呀，摄像头好像害羞躲起来了～已帮你切到"瓜田选瓜"模式，动动手指挑一颗可爱的小西瓜来测吧！🍉');
        setUseRealCamera(false);
      }
    }
  };

  const stopCamera = () => {
    setCamCountdown(0);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // --- Trigger Real Webcam Snapshot Action ---
  const captureWebcamAndAnalyze = async () => {
    if (!videoRef.current) return;
    try {
      // Step 1: Capture frame to canvas
      const liveCanvas = document.createElement('canvas');
      liveCanvas.width = 400;
      liveCanvas.height = 400;
      const ctx = liveCanvas.getContext('2d');
      if (!ctx) return;

      // Flip horizontal for intuitive mirror selfie feel if front camera
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);

      // Step 2: 前端像素分析西瓜检测（零延迟）
      setIsDetectingWatermelon(true);
      const detection = detectWatermelonFromCanvas(liveCanvas);
      // 加一点小延迟让用户看到检测过程的感觉～
      await new Promise(r => setTimeout(r, 600));
      setIsDetectingWatermelon(false);

      if (!detection.hasWatermelon) {
        const retake = window.confirm(
          `🔍 小精灵看了看镜头～\n\n` +
          `它觉得画面里：${detection.description || '好像没有西瓜呢'}\n` +
          `把握度：${detection.confidence === 'high' ? '很有把握' : detection.confidence === 'medium' ? '不太确定' : '可能看走眼了'}\n\n` +
          `好像没看到西瓜诶～\n` +
          `点"确定"重新拍一张，"取消"就当有瓜继续测！`
        );
        if (retake) {
          // Re-open camera for retake
          stopCamera();
          setTimeout(() => toggleCamera(), 300);
          return;
        }
      }

      // Step 3: Perform REAL canvas color analysis on the video crop!
      const imgData = ctx.getImageData(50, 50, 300, 300);
      const pixels = imgData.data;

      let rSum = 0, gSum = 0, bSum = 0;
      let count = 0;
      let stripeVarianceBucket = [];

      // Loop over 300x300 image pixels in a fast grid
      for (let i = 0; i < pixels.length; i += 32) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        rSum += r;
        gSum += g;
        bSum += b;
        count++;

        // Stripe contrast indicator is determined by measuring variance on green channel
        stripeVarianceBucket.push(g);
      }

      const meanG = gSum / count;
      let sumSqDiff = 0;
      stripeVarianceBucket.forEach(val => {
        sumSqDiff += Math.pow(val - meanG, 2);
      });
      const sdG = Math.sqrt(sumSqDiff / stripeVarianceBucket.length);

      // Compute simple ratios
      const rawContrast = Math.min(1, sdG / 65);
      const rawG = Math.min(1, Math.max(0.1, meanG / 180));

      setDetectedContrast(rawContrast);
      setDetectedGreenness(rawG);

      // Determine preliminary ripeness from actual pixel data for the pixel-art face
      const preliminaryStatus: WatermelonStatus =
        rawG > 0.55 && rawContrast > 0.45 ? 'ripe' :
        rawG < 0.35 ? 'unripe' : 'overripe';

      // Convert to cute pixel-art watermelon (replaces raw photo storage)
      const pixelArtUrl = convertToPixelArt(liveCanvas, preliminaryStatus);
      setCapturedPhotoUrl(pixelArtUrl);
      stopCamera();

      // Audio cues
      gameAudio.playSuccess();
    } catch (e) {
      console.error(e);
      setIsDetectingWatermelon(false);
    }
  };

  // 摄像头 5 秒自动抓拍（放在 captureWebcamAndAnalyze 定义之后）
  useEffect(() => {
    if (!isCameraActive || camCountdown <= 0) return;
    const id = setTimeout(() => {
      if (camCountdown <= 1) {
        setCamCountdown(0);
        captureWebcamAndAnalyze();
      } else {
        setCamCountdown(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [isCameraActive, camCountdown]);

  // --- Simulate Virtual Taps ---
  const simulateVirtualTap = (type: 'unripe' | 'ripe' | 'overripe') => {
    gameAudio.playWatermelonTap(type);
    let simulatedFreq = 125;
    if (type === 'unripe') simulatedFreq = 270;
    else if (type === 'overripe') simulatedFreq = 72;

    setDetectedFrequency(simulatedFreq);
    // Flash visually to mimic sound wave peak
    setWaterMelonPreset(type);
  };

  // --- Analyze Ripeness Results ---
  const executeScanAnalysis = () => {
    if (detectedFrequency === 0) {
      alert('咦，还没听到瓜瓜的声音呢！先点一下"仿真敲击"按钮，或者打开麦克风用指节轻轻敲敲西瓜～🔊');
      return;
    }

    setAnalyzing(true);
    gameAudio.playPop();

    setTimeout(() => {
      // Core calculation logic (Pure client side, zero LLM dependencies!)
      let soundScoreValue = 0;
      let ripenessPercent = 0;
      let resultStatusValue: WatermelonStatus = 'ripe';
      let predictedStars = 5;

      const freqHz = detectedFrequency;

      // 1. Calculate sound factor
      if (freqHz >= 95 && freqHz <= 165) {
        // Perfect thud sound ("dong-dong" low resonance)
        soundScoreValue = 100 - Math.abs(125 - freqHz) * 0.5; // peak score at 125Hz
        resultStatusValue = 'ripe';
      } else if (freqHz > 165) {
        // Too high "tang-tang". Unripe.
        soundScoreValue = Math.max(10, 80 - (freqHz - 165) * 0.4);
        resultStatusValue = 'unripe';
      } else {
        // Under 95Hz: too low, muffled hollow pulp. Overripe/Loose.
        soundScoreValue = Math.max(20, 85 - (95 - freqHz) * 0.9);
        resultStatusValue = 'overripe';
      }

      // 2. Look factor
      let stripeScoreValue = 85; 
      if (capturedPhotoUrl) {
        // Actual webcam image statistics
        stripeScoreValue = Math.round(detectedContrast * 60 + detectedGreenness * 40);
      } else {
        // Virtual preset values
        if (waterMelonPreset === 'ripe') {
          stripeScoreValue = 97;
        } else if (waterMelonPreset === 'unripe') {
          stripeScoreValue = 42;
        } else {
          stripeScoreValue = 68;
        }
      }

      // Combine weights: Sound holds 60%, Stripe appearance holds 40%
      ripenessPercent = Math.round(soundScoreValue * 0.6 + stripeScoreValue * 0.4);
      ripenessPercent = Math.max(15, Math.min(100, ripenessPercent));

      // Classify overall state
      if (ripenessPercent >= 83) {
        resultStatusValue = 'ripe';
        predictedStars = 5;
        setCustomMelonName('脆甜极品爆汁王');
        setCustomComment('这西瓜太正宗了！敲击声深沉如闷雷，花纹清晰艳丽，果肉绝对是红亮起沙！咬一口蜜甜爆流，极力推荐！🍉');
      } else if (ripenessPercent >= 60) {
        if (freqHz < 95) {
          resultStatusValue = 'overripe';
          predictedStars = 3.5;
          setCustomMelonName('老牌沙烂熟透瓜');
          setCustomComment('甜度还可以，但是由于过度成熟有点空心化，声音显得沉闷和散。果感沙瓤偏粉，适合老人家吃！');
        } else {
          resultStatusValue = 'ripe';
          predictedStars = 4;
          setCustomMelonName('清甜脆皮标准瓜');
          setCustomComment('八分熟的标准夏日小西瓜，清脆利口，甜高水足，用来切块冰镇、或者砸榨西瓜汁都是消暑极品！');
        }
      } else {
        resultStatusValue = 'unripe';
        predictedStars = 2;
        setCustomMelonName('青涩白瓤钢铁瓜');
        setCustomComment('敲的声音跟个哑铃似的。条纹淡雅清心（没熟），切开估计是白里透粉，还是放阳台晒它几天吧，买瓜人的泪！🥺');
      }

      setCalculatedScore(ripenessPercent);
      setTestResultStatus(resultStatusValue);
      setCustomStars(Math.ceil(predictedStars));
      setAnalyzing(false);
      setTestDone(true);
      
      if (resultStatusValue === 'unripe') {
        gameAudio.playFailure();
      } else {
        gameAudio.playSuccess();
      }
    }, 1200); // Cute loading spinner animation effect
  };

  // --- Reset scanning flow ---
  const handleResetScan = () => {
    setTestDone(false);
    setDetectedFrequency(0);
    setCapturedPhotoUrl('');
    setWaterMelonPreset('ripe');
    gameAudio.playPop();
  };

  // --- What's up! reaction ---
  const handleWhatsUp = (id: string) => {
    gameAudio.playPop();
    const updated = records.map(r => {
      if (r.id === id) return { ...r, whatsUp: (r.whatsUp || 0) + 1 };
      return r;
    });
    saveRecordsToStorage(updated);
    fetch(`/chigua-api/records/${id}/whatsup`, { method: 'POST' })
      .catch(err => console.warn('[WhatsUp] 同步失败:', err));
  };

  // --- 踩价（降低报价在行情中的权重） ---
  const handleDisputePrice = (id: string) => {
    gameAudio.playPop();
    const updated = records.map(r => {
      if (r.id === id) return { ...r, priceDisputes: (r.priceDisputes || 0) + 1 };
      return r;
    });
    saveRecordsToStorage(updated);
    fetch(`/chigua-api/records/${id}/dispute-price`, { method: 'POST' })
      .catch(err => console.warn('[Dispute] 同步失败:', err));
    fetchMarketIndex(); // 刷新行情
  };

  // --- Like a Watermelon post inside SquareFeed ---
  const handleLikeRecord = (id: string) => {
    gameAudio.playPop();
    const updated = records.map(r => {
      if (r.id === id) {
        return { ...r, likes: r.likes + 1 };
      }
      return r;
    });
    saveRecordsToStorage(updated);
    // Sync like to server
    fetch(`/chigua-api/records/${id}/like`, { method: 'POST' })
      .catch(err => console.warn('[Like] 同步点赞失败:', err));
  };

  // --- Form submission to share the tested melon ---
  const handlePublishMelon = async (e: React.FormEvent) => {
    e.preventDefault();

    // Antispam mechanism check
    if (cooldownRemaining > 0) {
      alert(`❄️ 冰镇中～好瓜值得等一等！刚发完一条，让小冰箱再凉 ${cooldownRemaining} 秒就可以发下一条啦～默念：平心静气，瓜甜如蜜～🍉`);
      return;
    }

    // Build final text for moderation
    const finalName = customMelonName.trim() || '匿名的脆甜西瓜';
    const finalComment = customComment.trim() || '敲着很好声，夏天吃西瓜太绝啦！';
    const combinedText = `${finalName} ${finalComment}`;

    // Call DeepSeek AI moderation (non-debounced, direct call)
    const modResult = await checkContent(combinedText);

    if (modResult.flagged) {
      const categoryNames = modResult.categories
        .map(c => MODERATION_POLICY.find(p => p.id === c)?.category || c)
        .join('、');
      const suggestionText = modResult.suggestion
        ? `\n\n💡 小审核员悄悄说：${modResult.suggestion}`
        : '';
      const confirmed = window.confirm(
        `🤔 小审核员歪了歪头～\n\n` +
        `它觉得内容里有：${categoryNames}\n` +
        `要不改得再温柔一点？${suggestionText}\n\n` +
        `点"确定"就这样发啦，"取消"回去再改改～`
      );
      if (!confirmed) return;
    }

    // GPS privacy — only city-level location, no precise coords
    // (reverse geocoding already returns city name, so no extra warning needed)

    // Fallback Image generation based on testStatus if webcam wasn't captured
    const finalPhoto = capturedPhotoUrl || getWatermelonImageURL(testResultStatus, finalName);

    // Map ripeness to mood status dynamically
    let customMood = '❤️ 元气脆甜心情';
    if (testResultStatus === 'unripe') customMood = '🟢 青涩迷茫心境';
    else if (testResultStatus === 'overripe') customMood = '🧘 佛系看淡心境';

    const newRecord: WatermelonRecord = {
      id: 'melon-' + Date.now(),
      name: finalName,
      soundScore: testResultStatus === 'ripe' ? 95 : testResultStatus === 'unripe' ? 25 : 75,
      lookScore: testResultStatus === 'ripe' ? 92 : testResultStatus === 'unripe' ? 35 : 65,
      overallScore: calculatedScore,
      frequency: detectedFrequency || 120,
      stripeContrast: testResultStatus === 'ripe' ? 0.9 : testResultStatus === 'unripe' ? 0.3 : 0.6,
      greenness: testResultStatus === 'ripe' ? 0.8 : testResultStatus === 'unripe' ? 0.5 : 0.6,
      ripenessStatus: testResultStatus,
      ratedStars: customStars,
      message: finalComment,
      timestamp: Date.now(),
      photoUrl: finalPhoto,
      likes: 0,
      whatsUp: 0,
      priceDisputes: 0,
      location: customLocation.trim() || '📍 秘密吃瓜据点',
      mood: customMood,
      // 华强买瓜：价格行情
      pricePerJin: customPrice ? parseFloat(customPrice) : undefined,
      isSelfSplit,
      purchaseLocation: purchaseLocation.trim() || undefined
    };

    const updated = [newRecord, ...records];
    saveRecordsToStorage(updated, newRecord);

    // Trigger cooldown rate limit to prevent spam (60 seconds)
    const currentEnd = Date.now() + 60 * 1000;
    localStorage.setItem('melon_cooldown_ends_at', String(currentEnd));
    setCooldownRemaining(60);

    // Cute success celebrations
    gameAudio.playSuccess();

    // Refresh market index & redirect to feed
    fetchMarketIndex();
    setActiveSegment('community');
  };

  return (
    <div className="min-h-screen bg-[#FFFDF6] text-emerald-950 font-sans pb-16 selection:bg-rose-200 selection:text-rose-900">
      
      {/* Cartoon Top Banner / Summer Clouds */}
      <div className="relative overflow-hidden bg-rose-100 border-b-4 border-emerald-950 px-4 pt-10 pb-12 flex flex-col items-center text-center">
        {/* Floating clouds in background */}
        <div className="absolute top-4 left-6 text-4xl select-none opacity-30 animate-pulse">☁️</div>
        <div className="absolute top-10 right-8 text-4xl select-none opacity-30 animate-bounce delay-1000">☁️</div>
        
        {/* Adorable spinning melon slice icon */}
        <motion.div 
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="mb-3 relative w-20 h-20 flex items-center justify-center bg-white rounded-full border-4 border-emerald-950 shadow-[3px_3px_0px_0px_#064e3b]"
        >
          {slicedMelonIcon ? (
            <img 
              src={slicedMelonIcon} 
              alt="Sweet icon" 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-4xl text-rose-500">🍉</span>
          )}
          <span className="absolute -top-1 -right-1 text-base">✨</span>
        </motion.div>

        {/* Title and subtitle */}
        <h1 className="text-3xl sm:text-4px font-black tracking-tight text-emerald-900 inline-flex items-center gap-2 font-sans">
          吃 瓜 大 师
          <span className="text-xs bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full border-2 border-emerald-950 rotate-3 shadow-[1.5px_1.5px_0px_0px_#064e3b]">
            SUMMER VIBES
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-bold text-emerald-800 max-w-md leading-relaxed px-4">
          🍉 炎炎夏日「拍一拍听声」测熟度，AI小精灵帮你判定西瓜甜不甜！不买生瓜蛋子，做街头最靓的吃瓜小行家！
        </p>

        {/* Dynamic Watermelon Eating Cycle Announcement Board */}
        <div className="mt-4 bg-[#FFFDF0] hover:bg-[#FFFCEB] transition-all border-2 border-emerald-950 px-4 py-2.5 rounded-2xl max-w-xs sm:max-w-md shadow-[3px_3px_0px_0px_#064e3b] flex flex-col items-center gap-1.5 text-[11px] relative">
          <div className="absolute -top-2 -left-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-emerald-950 uppercase tracking-widest rotate-[-5deg] shadow-[1px_1px_0px_0px_#064e3b]">
            新鲜保质 🧊
          </div>
          <div className="flex items-center gap-1.5 font-black text-rose-600 mt-0.5">
            <span>🕐</span>
            <span>不吃隔夜瓜！距离凌晨清空还剩 <strong className="text-xs sm:text-sm bg-rose-500 text-white font-black px-2 py-0.5 rounded-md border border-emerald-950 font-mono shadow-[1.5px_1.5px_0px_0px_#4c0519]">{resetCountdown || '--:--:--'}</strong></span>
          </div>
          <p className="text-emerald-900 leading-normal font-bold text-center">
            🔔 <strong>不吃隔夜瓜小喇叭</strong>：隔夜西瓜可不好吃！每天凌晨 <strong>01:00</strong> 瓜田会清清爽爽焕新，昨天的瓜贴都会变成甜蜜回忆～趁新鲜赶紧拍拍瓜、晒晒图吧！🍉
          </p>
        </div>

        {/* Floating decorations */}
        <div className="absolute -bottom-1 left-0 right-0 h-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 to-transparent"></div>
      </div>

      {/* Main Responsive Body Container */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Main Segment Swappings */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={() => {
              setActiveSegment('scan');
              gameAudio.playPop();
            }}
            id="tab-btn-scan"
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 border-4 border-emerald-950 transition-all ${
              activeSegment === 'scan'
                ? 'bg-emerald-800 text-white shadow-[4px_4px_0px_0px_#042f24] -translate-y-1'
                : 'bg-white text-emerald-950 hover:bg-emerald-100 shadow-[2px_2px_0px_0px_#064e3b]'
            }`}
          >
            🔊 拍拍瓜测熟度
          </button>
          
          <button
            onClick={() => {
              setActiveSegment('community');
              gameAudio.playPop();
            }}
            id="tab-btn-community"
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 border-4 border-emerald-950 transition-all ${
              activeSegment === 'community'
                ? 'bg-rose-600 text-white shadow-[4px_4px_0px_0px_#4c0519] -translate-y-1'
                : 'bg-white text-emerald-950 hover:bg-emerald-100 shadow-[2px_2px_0px_0px_#064e3b]'
            }`}
          >
            🔥 吃瓜小广场
            {records.length > 0 && (
              <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-950">
                {records.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Renderers */}
        <AnimatePresence mode="wait">
          {activeSegment === 'scan' ? (
            <motion.div
              key="panel-scan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              
              {/* Scan Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Lateral controls & input devices (Left column, 7 spans) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* STEP 1: Microphones Sound Tapping */}
                  <div className="bg-white border-4 border-emerald-950 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#064e3b]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-6 h-6 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-xs">1</span>
                        第一步：检测拍瓜音频
                      </h3>
                      <div className="flex items-center gap-1 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-900">
                        <span>🔊</span> 拍拍西瓜听声辨熟
                      </div>
                    </div>

                    {/* Waveform Canvas */}
                    <div className="mb-4">
                      <WaveformVisualizer
                        analyser={analyserRef.current}
                        isListening={isListeningMic}
                        themeColor="#EF5350"
                      />
                    </div>

                    {/* Mic Trigger */}
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border-2 border-emerald-900/10 mb-4 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-950">🎙️ 拍击麦克风检测仪</p>
                        <p className="text-[10px] text-emerald-800">用拳头轻轻叩击瓜皮，本设备将自动捕获并分析叩击频率。</p>
                      </div>
                      
                      <button
                        onClick={toggleMicrophone}
                        className={`px-4 py-2 font-black text-xs border-2 border-emerald-950 rounded-xl transition-all shadow-[2px_2px_0px_0px_#064e3b] ${
                          isListeningMic
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-white text-emerald-950 hover:bg-emerald-100'
                        }`}
                      >
                        {isListeningMic ? `🔴 停止 (${micCountdown}s)` : '🎙️ 开启监听'}
                      </button>
                    </div>

                    {/* Ambient / Simulated fallback taps */}
                    <div className="border-t border-dashed border-emerald-900/10 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-900">🎛️ 听声虚拟叩击器（懒人/电脑测试）</span>
                        <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-extrabold border border-red-200">免麦克风</span>
                      </div>
                      <p className="text-[10.5px] text-emerald-800 mb-3">
                        手边没有真瓜？点下面按钮模拟敲瓜声，一样能听到瓜瓜的声音哦！
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => simulateVirtualTap('unripe')}
                          className="bg-emerald-50 hover:bg-emerald-100 ring-2 ring-emerald-900/10 hover:ring-emerald-900/30 text-emerald-900 px-2 py-2.5 rounded-xl text-center transition-all duration-200 active:scale-95 group"
                        >
                          <p className="font-extrabold text-xs">🔔 铛铛响</p>
                          <p className="text-[9px] text-emerald-800 mt-1">还没熟呢～</p>
                        </button>
                        <button
                          onClick={() => simulateVirtualTap('ripe')}
                          className="bg-rose-50 hover:bg-rose-100 ring-2 ring-rose-900/10 hover:ring-rose-900/30 text-rose-900 px-2 py-2.5 rounded-xl text-center transition-all duration-200 active:scale-95 group"
                        >
                          <p className="font-extrabold text-xs">🥁 咚咚响</p>
                          <p className="text-[9px] text-rose-800 mt-1">甜甜好瓜～</p>
                        </button>
                        <button
                          onClick={() => simulateVirtualTap('overripe')}
                          className="bg-amber-50 hover:bg-amber-100 ring-2 ring-amber-900/10 hover:ring-amber-900/30 text-amber-900 px-2 py-2.5 rounded-xl text-center transition-all duration-200 active:scale-95 group"
                        >
                          <p className="font-extrabold text-xs">🪵 噗噗响</p>
                          <p className="text-[9px] text-amber-800 mt-1">熟透沙沙的～</p>
                        </button>
                      </div>
                    </div>

                    {/* Frequency Details Gauge */}
                    <div className="mt-4 bg-[#FFFDF9] border-2 border-emerald-950 p-2.5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-extrabold">⚙️</div>
                        <div>
                          <p className="text-[10px] text-emerald-800 font-bold leading-none">捕获声频数据</p>
                          <p className="text-emerald-950 font-black text-sm mt-1">
                            {detectedFrequency ? `${detectedFrequency} Hz` : '等瓜瓜被敲响...'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          detectedFrequency === 0 ? 'bg-gray-100 text-gray-400' :
                          detectedFrequency > 180 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          detectedFrequency < 90 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {detectedFrequency === 0 ? '还没敲到～' :
                           detectedFrequency > 180 ? '声音清脆(还生着呢)' :
                           detectedFrequency < 90 ? '声音闷闷的(熟透啦)' :
                           '声音刚刚好(甜甜熟)'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* STEP 2: Camera Appearance */}
                  <div className="bg-white border-4 border-emerald-950 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#064e3b]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-6 h-6 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-xs">2</span>
                        第二步：检测瓜体成色 <span className="text-xs text-gray-400 font-normal">(可选)</span>
                      </h3>
                      <span className="text-[10px] font-mono font-bold bg-[#EFF6FF] text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        📷 视觉采样 
                      </span>
                    </div>

                    <p className="text-xs text-emerald-800 mb-4">
                      成熟的好瓜条纹应该深浅分明，墨绿条纹有弹性，底色带熟黄晒斑。
                    </p>

                    {/* Camera Trigger panel */}
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border-2 border-emerald-900/10 mb-4 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-950">📷 摄像头实地拍摄</p>
                        <p className="text-[10px] text-emerald-800">对准买回来的瓜进行拍摄，我们会扫描皮肤色素分布及条纹高低频对比度。</p>
                      </div>
                      
                      <button
                        onClick={toggleCamera}
                        className={`px-4 py-2 font-black text-xs border-2 border-emerald-950 rounded-xl transition-all shadow-[2px_2px_0px_0px_#064e3b] ${
                          isCameraActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-emerald-950 hover:bg-emerald-100'
                        }`}
                      >
                        {isCameraActive ? `🔴 关掉 (${camCountdown}s)` : '📷 打开小镜头'}
                      </button>
                    </div>

                    {/* Pre-designed presets for appearance simulator */}
                    <div className="border-t border-dashed border-emerald-900/10 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-900">🏞️ 仿真西瓜外观（免相机）</span>
                        <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-extrabold border border-red-200">免镜头</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setWaterMelonPreset('unripe');
                            setCapturedPhotoUrl('');
                            gameAudio.playPop();
                          }}
                          className={`px-2 py-2 rounded-xl text-center border-2 transition-all duration-200 ${
                            waterMelonPreset === 'unripe' && !capturedPhotoUrl
                              ? 'border-emerald-800 bg-emerald-50 font-bold'
                              : 'border-transparent bg-[#F8FAFC]'
                          }`}
                        >
                          <span className="text-xs">🟢 浑圆淡雅青涩</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setWaterMelonPreset('ripe');
                            setCapturedPhotoUrl('');
                            gameAudio.playPop();
                          }}
                          className={`px-2 py-2 rounded-xl text-center border-2 transition-all duration-200 ${
                            waterMelonPreset === 'ripe' && !capturedPhotoUrl
                              ? 'border-emerald-800 bg-rose-50 font-bold'
                              : 'border-transparent bg-[#F8FAFC]'
                          }`}
                        >
                          <span className="text-xs">🍉 斑纹极清甜熟</span>
                        </button>

                        <button
                          onClick={() => {
                            setWaterMelonPreset('overripe');
                            setCapturedPhotoUrl('');
                            gameAudio.playPop();
                          }}
                          className={`px-2 py-2 rounded-xl text-center border-2 transition-all duration-200 ${
                            waterMelonPreset === 'overripe' && !capturedPhotoUrl
                              ? 'border-emerald-800 bg-amber-50 font-bold'
                              : 'border-transparent bg-[#F8FAFC]'
                          }`}
                        >
                          <span className="text-xs">🍂 暗淡不匀熟透</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Right Column: Visual Monitor Canvas / Video Frame (5 spans) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Watermelon Screen Display */}
                  <div className="bg-white border-4 border-emerald-950 rounded-3xl p-5 flex flex-col items-center shadow-[4px_4px_0px_0px_#064e3b]">
                    <h4 className="text-sm font-extrabold text-emerald-950 mb-3 self-start">
                      👁️ 西瓜实时显示屏
                    </h4>

                    {/* Camera view container, fits perfectly in a circle */}
                    <div className="relative w-full aspect-square max-w-[280px] rounded-3xl border-4 border-emerald-950 spill-hidden bg-[#F1FFF7] flex items-center justify-center overflow-hidden shadow-inner">
                      {isCameraActive ? (
                        <>
                          <video
                            ref={videoRef}
                            playsInline
                            muted
                            className="absolute w-full h-full object-cover transform scale-x-[-1]"
                          />
                          {/* 抓拍倒计时覆盖层 */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="text-center">
                              <span className="text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">
                                {camCountdown}
                              </span>
                              <p className="text-xs font-black text-white/80 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                {camCountdown > 1 ? '秒后自动抓拍' : '正在抓拍...'}
                              </p>
                            </div>
                          </div>
                          {/* Circle boundary indicator overlay */}
                          <div className="absolute inset-0 border-8 border-rose-500/30 rounded-full flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-white font-black bg-rose-600/70 border border-emerald-950 px-2 py-0.5 rounded-full absolute bottom-4">
                              西瓜对准红框中央
                            </span>
                          </div>
                        </>
                      ) : capturedPhotoUrl ? (
                        <img
                          src={capturedPhotoUrl}
                          alt="Captured watermelon"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <canvas
                          ref={previewCanvasRef}
                          width={280}
                          height={280}
                          className="w-full h-full block"
                        />
                      )}
                    </div>

                    {/* Snapshot button only when active webcam */}
                    {isCameraActive && (
                      <button
                        onClick={captureWebcamAndAnalyze}
                        disabled={isDetectingWatermelon}
                        className="mt-4 w-full bg-emerald-800 hover:bg-emerald-900 border-2 border-emerald-950 text-white font-extrabold text-xs py-2 rounded-xl transition-all duration-150 shadow-[2px_2px_0px_0px_#042f24] active:translate-y-[1px] disabled:opacity-60 disabled:cursor-wait"
                      >
                        {isDetectingWatermelon ? '🔍 小精灵正在看...' : `📸 立即抓拍 (${camCountdown}s)`}
                      </button>
                    )}

                    {/* Snapshot state description */}
                    {!isCameraActive && (
                      <div className="mt-4 text-center">
                        {capturedPhotoUrl ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-emerald-800 font-bold">🟢 已捕获实物快照</p>
                            <button
                              onClick={() => setCapturedPhotoUrl('')}
                              className="text-[10px] text-rose-600 underline font-extrabold"
                            >
                              清除还原为虚拟瓜田
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10.5px] text-emerald-800 italic">
                            {waterMelonPreset === 'unripe' ? '小生瓜：条纹淡淡的，还没睡醒～' :
                             waterMelonPreset === 'ripe' ? '黄金瓜：花纹亮亮的，正是好时候！' :
                             '熟透瓜：瓜皮有点暗，甜得不要不要的～'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ready to Analyze Trigger */}
                  <div className="bg-amber-100 border-4 border-emerald-950 p-4 rounded-3xl shadow-[3px_3px_0px_0px_#064e3b] text-center space-y-3">
                    <p className="text-xs font-black text-emerald-950 leading-relaxed">
                      {detectedFrequency === 0 
                        ? '💡 敲敲西瓜、听听声音，就能解锁拍瓜分析啦！'
                        : '🎉 听到声音啦！快来看看你的瓜熟不熟吧～'}
                    </p>

                    <button
                      onClick={executeScanAnalysis}
                      disabled={analyzing}
                      className={`w-full py-4 rounded-2xl border-4 border-emerald-950 font-black text-base transition-all ${
                        analyzing 
                          ? 'bg-amber-200 text-amber-800 cursor-not-allowed'
                          : detectedFrequency === 0
                          ? 'bg-amber-50 hover:bg-amber-100 text-emerald-950/45 cursor-not-allowed opacity-50 shadow-none'
                          : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-[4px_4px_0px_0px_#4c0519]'
                      }`}
                    >
                      {analyzing ? '⏳ 正在用小耳朵听听这瓜熟不熟...' : '⭐ 拍一拍，看瓜熟不熟！'}
                    </button>
                  </div>

                </div>

              </div>

              {/* SECTION: RESULTS DISPLAY SCREEN */}
              {testDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  id="results-panel"
                  className="bg-emerald-50 border-4 border-emerald-950 rounded-3xl p-6 shadow-[5px_5px_0px_0px_#064e3b]"
                >
                  <div className="flex items-center justify-between border-b-2 border-dashed border-emerald-900/20 pb-4 mb-6">
                    <h3 className="text-lg font-black text-emerald-950 flex items-center gap-1.5">
                      📊 测瓜判定报告书
                    </h3>
                    <button
                      onClick={handleResetScan}
                      className="text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-xl border-2 border-emerald-950 transition-all shadow-[1.5px_1.5px_0px_0px_#064e3b] active:scale-95"
                    >
                      🔄 重新检测
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Circle chart Gauge (Left columns) */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-emerald-950">
                      <p className="text-[11px] font-bold text-gray-500 mb-2">综合甜度成熟分数</p>
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        
                        {/* Circular animated progress ring */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            className="stroke-gray-100"
                            strokeWidth="12"
                            fill="transparent"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            className={
                              testResultStatus === 'ripe' ? 'stroke-rose-500' :
                              testResultStatus === 'unripe' ? 'stroke-emerald-500' :
                              'stroke-amber-500'
                            }
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - calculatedScore / 100)}
                            strokeLinecap="round"
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black text-emerald-950 leading-none">{calculatedScore}%</span>
                          <span className="text-[9.5px] text-emerald-800 font-bold mt-1">
                            {testResultStatus === 'ripe' ? '水嘟嘟的甜🍬' :
                             testResultStatus === 'unripe' ? '还有点小生涩🌱' :
                             '沙沙的熟透啦🍯'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-center">
                        <span className="text-xs font-bold bg-[#FFFDF0] border border-amber-300 text-amber-900 px-2 py-0.5 rounded-full">
                          拍出来声音是: {detectedFrequency} Hz
                        </span>
                      </div>
                    </div>

                    {/* Results details (Right columns) */}
                    <div className="md:col-span-8 space-y-4">
                      
                      {/* Ripeness category banner */}
                      <div className="p-4 bg-white rounded-2xl border-2 border-emerald-950">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-bold">瓜王属性认证:</span>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded border ${
                            testResultStatus === 'unripe' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' :
                            testResultStatus === 'ripe' ? 'bg-rose-100 text-rose-900 border-rose-400' :
                            'bg-amber-100 text-amber-900 border-amber-400'
                          }`}>
                            {testResultStatus === 'unripe' ? '🟢 青涩偏生' :
                             testResultStatus === 'ripe' ? '🍉 脆甜正红' :
                             '🩸 沙爽爆瓤'}
                          </span>
                        </div>

                        <h4 className="text-xl font-extrabold text-emerald-950">
                          🍉 {customMelonName}
                        </h4>

                        <div className="flex items-center gap-1.5 mt-2 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={18}
                              fill={i < customStars ? 'currentColor' : 'none'}
                              className={i < customStars ? 'fill-amber-400' : 'text-gray-200'}
                            />
                          ))}
                          <span className="text-xs font-bold text-emerald-800 ml-1">推荐指数 {customStars} 星</span>
                        </div>
                      </div>

                      {/* Ripeness to Mood Mental Status Mapping */}
                      <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-950 rounded-2xl flex flex-col justify-center shadow-[1.5px_1.5px_0px_0px_#064e3b]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm">🧠</span>
                          <span className="text-xs font-black text-emerald-950">西瓜成熟度同步映射你的吃瓜心情：</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-1 rounded-lg border-2 text-center shrink-0 ${
                            testResultStatus === 'unripe' ? 'bg-emerald-100 border-emerald-950 text-emerald-950' :
                            testResultStatus === 'ripe' ? 'bg-rose-100 border-rose-950 text-rose-950' :
                            'bg-amber-100 border-amber-950 text-amber-950'
                          }`}>
                            {testResultStatus === 'unripe' ? '🟢 青涩迷茫心境' :
                             testResultStatus === 'ripe' ? '❤️ 元气脆甜心情' :
                             '🧘 佛系看淡心境'}
                          </span>
                          <p className="text-[10.5px] font-bold text-emerald-900 leading-relaxed font-sans">
                            {testResultStatus === 'unripe' && '"虽然还有点生，但也是甜甜的期待呀～放它两天，说不定就悄悄变甜了呢！🌱"'}
                            {testResultStatus === 'ripe' && '"刚刚好的黄金甜熟！咔嚓一口汁水四溅，感觉整个夏天都被灌满了甜甜的幸福～☀️"'}
                            {testResultStatus === 'overripe' && '"熟透了也是一种温柔～沙沙的口感像棉花糖，佛系躺平看云朵，随缘吃瓜最自在～☁️"'}
                          </p>
                        </div>
                      </div>

                      {/* Diagnostic details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-emerald-950/20">
                          <p className="text-gray-400 font-medium">🔊 物理声学特征</p>
                          <p className="text-emerald-950 font-black mt-1">
                            {detectedFrequency < 90 ? '声音闷闷的 (熟透啦)' :
                             detectedFrequency <= 165 ? '声音刚刚好 (黄金甜熟)' :
                             '声音脆脆的 (还生呢)'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-emerald-950/20">
                          <p className="text-gray-400 font-medium">🎨 视觉纹理等级</p>
                          <p className="text-emerald-950 font-black mt-1">
                            {capturedPhotoUrl ? '📸 真实一拍' : '🎨 虚拟小画家'}
                          </p>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* SHARE POST ENTRY FORM - User can publish their watermelon details */}
                  <form onSubmit={handlePublishMelon} className="mt-8 pt-6 border-t-2 border-dashed border-emerald-900/20">
                    <h4 className="text-sm font-black text-emerald-950 mb-4 flex items-center gap-1.5">
                      📢 晒晒我的西瓜 (发布至吃瓜广场)
                    </h4>

                    {/* User Melon Passport Identity Badge + Anti-Spam State */}
                    <div className="bg-gradient-to-br from-emerald-100/55 to-amber-100/40 p-3 rounded-2xl border-2 border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#064e3b] mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎫</span>
                        <div>
                          <p className="text-[9.5px] font-bold text-gray-500">本地吃瓜安全通行证 (绿码防刷免注册)</p>
                          <p className="text-xs font-black text-emerald-950 font-mono tracking-wider">{melonPassport || '生成中...'}</p>
                        </div>
                      </div>

                      {cooldownRemaining > 0 ? (
                        <div className="bg-rose-100 text-rose-900 border-2 border-rose-300 font-extrabold text-[10px] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0 animate-pulse">
                          <span>❄️ 降温冰镇中：</span>
                          <span className="text-xs font-mono font-black">{cooldownRemaining}s</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-black text-[10.5px] px-2.5 py-1 rounded-xl shrink-0 flex items-center gap-1">
                          🟢 允许发帖
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Name input */}
                      <div>
                        <label className="block text-xs font-bold text-emerald-900 mb-1">
                          给这个瓜起个拉风的名字
                        </label>
                        <input
                          type="text"
                          required
                          value={customMelonName}
                          onChange={(e) => setCustomMelonName(e.target.value)}
                          className="w-full bg-white border-2 border-emerald-950 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:border-rose-500 font-bold text-emerald-950"
                          placeholder="例如：王阿姨买的超级大母瓜"
                        />
                      </div>

                      {/* Rating input */}
                      <div>
                        <label className="block text-xs font-bold text-emerald-900 mb-1">
                          自我鉴赏好瓜感官打分
                        </label>
                        <div className="flex gap-2 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setCustomStars(s);
                                gameAudio.playPop();
                              }}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                size={22}
                                fill={s <= customStars ? 'currentColor' : 'none'}
                                className={s <= customStars ? 'text-amber-400' : 'text-gray-300'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment text area */}
                      <div>
                        <label className="block text-xs font-bold text-emerald-900 mb-1">
                          吃瓜感想吐槽 (晒瓜文案)
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={customComment}
                          onChange={(e) => setCustomComment(e.target.value)}
                          className="w-full bg-white border-2 border-emerald-950 rounded-xl p-3 text-xs focus:ring-0 focus:border-rose-500 leading-relaxed font-bold text-emerald-950"
                          placeholder="写下你吃瓜的喜怒哀乐..."
                        />
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={handleHuaqiangRewrite}
                            disabled={isRewriting || !customComment.trim()}
                            className="text-[10px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                          >
                            {isRewriting ? '🔫 华强正在帮你凶一个...' : '🔫 华强化一下'}
                          </button>
                        </div>
                      </div>

                      {/* Location — GPS 自动定位 */}
                      <div className="bg-amber-50/50 p-4 border-2 border-emerald-950 rounded-2xl space-y-3 shadow-[2px_2px_0px_0px_#064e3b]">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-emerald-950 flex items-center gap-1">
                            <span>📍</span> 你在哪片瓜田？
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoGetLocation}
                          disabled={isFetchingLocation}
                          className="w-full py-2.5 px-4 rounded-xl border-2 border-emerald-950 font-black text-xs bg-white hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-[1.5px_1.5px_0px_0px_#064e3b] active:translate-y-[1px]"
                        >
                          {isFetchingLocation ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin inline-block">🌀</span> 正在定位你的瓜田...
                            </span>
                          ) : (
                            <>
                              <span>📱</span> 点我自动定位
                            </>
                          )}
                        </button>
                        {customLocation && (
                          <div className="bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-300 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-900 truncate">
                              <span className="animate-pulse">🟢</span>
                              <span className="truncate">{customLocation}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 华强买瓜：价格上报 */}
                      <div className="bg-amber-50/80 border-2 border-emerald-950 p-4 rounded-2xl space-y-3 shadow-[2px_2px_0px_0px_#064e3b]">
                        <div className="flex items-center gap-2 border-b-2 border-dashed border-emerald-950/10 pb-2">
                          <span className="text-base">💰</span>
                          <span className="text-xs font-black text-emerald-950">华强买瓜 · 这瓜多少钱一斤？</span>
                          <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">选填</span>
                        </div>
                        {/* 单价拖拽条 */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black text-emerald-900 flex items-center gap-1">
                              💴 这瓜多少钱一斤？
                            </label>
                            <span className="text-sm font-black text-rose-600">
                              {customPrice ? `¥${customPrice} /斤` : '还没选～'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="0.5"
                            value={customPrice || 0}
                            onChange={e => setCustomPrice(e.target.value)}
                            className="w-full h-2 bg-emerald-200 rounded-full appearance-none cursor-pointer accent-rose-500 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-950"
                          />
                          <div className="flex justify-between text-[8px] text-emerald-500 font-medium mt-0.5">
                            <span>¥0 (白送?)</span>
                            <span>¥10</span>
                            <span>¥20 (金子做的?)</span>
                          </div>
                        </div>

                        {/* 在哪买的（GPS自动） + 谁劈的 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-emerald-900 flex items-center gap-1 mb-1">
                              🌍 在哪买的
                            </label>
                            <div className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-emerald-950/30 bg-emerald-50/50 text-emerald-800 flex items-center gap-1.5">
                              <span className="text-[11px]">📍</span>
                              <span className="truncate">{purchaseLocation || '先去上面点定位～'}</span>
                            </div>
                          </div>
                          {/* 劈瓜选择：自己劈 vs 摊主劈 */}
                          <div>
                            <label className="text-[10px] font-black text-emerald-900 flex items-center gap-1 mb-1">
                              🔪 谁劈的瓜？
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setIsSelfSplit(true)}
                                className={`py-1.5 px-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                                  isSelfSplit
                                    ? 'bg-rose-500 text-white border-rose-700 shadow-[1px_1px_0px_0px_#9b1c1c]'
                                    : 'bg-white text-emerald-950 border-emerald-950/30 hover:bg-rose-50'
                                }`}
                              >
                                🔪 自己劈的
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSelfSplit(false)}
                                className={`py-1.5 px-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                                  !isSelfSplit
                                    ? 'bg-amber-500 text-white border-amber-700 shadow-[1px_1px_0px_0px_#92400e]'
                                    : 'bg-white text-emerald-950 border-emerald-950/30 hover:bg-amber-50'
                                }`}
                              >
                                🗡️ 摊主劈的
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI-Powered Content Moderation Rule Board and Real-time Preview */}
                      <div className="bg-emerald-50/80 border-2 border-emerald-950 p-4 rounded-2xl space-y-3 shadow-[2px_2px_0px_0px_#064e3b]">
                        <div
                          className="flex items-center justify-between gap-2 border-b-2 border-dashed border-emerald-950/10 pb-2 cursor-pointer select-none"
                          onClick={() => setShowRules(!showRules)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">🛡️</span>
                            <span className="text-xs font-black text-emerald-950">绿色吃瓜广场 AI 内容审核准则</span>
                          </div>
                          <span className={`text-xs transition-transform duration-200 ${showRules ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </div>

                        {showRules && (
                          <>
                            <p className="text-[10.5px] leading-relaxed text-emerald-900">
                              吃瓜本是一场欢声笑语的夏日分享～为了<strong>让广场甜甜的、暖暖的，不被坏情绪打扰</strong>，我们请了一位 <strong>AI 小审核员</strong> 帮忙看看内容，对这三类小状况提个醒：
                            </p>

                            {/* Policy columns */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                              {MODERATION_POLICY.map((policy) => (
                                <div key={policy.id} className="bg-white border-2 border-emerald-950/20 p-2.5 rounded-xl flex flex-col justify-between">
                                  <p className="text-[10.5px] font-black text-emerald-950 leading-tight">
                                    {policy.icon} {policy.category}
                                  </p>
                                  <p className="text-[9px] text-gray-600 font-bold mt-1.5 leading-normal">
                                    {policy.desc}
                                  </p>
                                  <div className="mt-2 bg-blue-50 border border-blue-200 p-1.5 rounded-lg">
                                    <p className="text-[8.5px] text-blue-800 font-bold">📋 规则范围：</p>
                                    <p className="text-[9px] font-bold text-blue-900 mt-0.5 leading-tight">{policy.examples}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Real-time AI moderation preview */}
                        {(customComment.trim() || customMelonName.trim()) && (
                            <div className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                              previewModeration.flagged
                                ? 'bg-[#FFFBEB] border-amber-500 shadow-[2px_2px_0px_0px_#b45309]'
                                : previewModeration.loading
                                ? 'bg-[#F8FAFC] border-gray-300'
                                : 'bg-[#F0FDF4] border-emerald-500 shadow-[2px_2px_0px_0px_#047857]'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-black flex items-center gap-1.5 text-emerald-950">
                                  {previewModeration.loading
                                    ? '🔄 小审核员正在看你的内容...'
                                    : previewModeration.flagged
                                    ? '⚠️ 小审核员觉得这里或许可以温柔一点：'
                                    : '✅ 小审核员说内容很甜很安全～'}
                                </span>
                                {previewModeration.flagged && (
                                  <span className="text-[9.5px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                                    建议优化 🧊
                                  </span>
                                )}
                                {previewModeration.error && !previewModeration.flagged && (
                                  <span className="text-[9px] text-gray-400">(审核服务暂不可用，可直接发布)</span>
                                )}
                              </div>

                              {previewModeration.flagged && previewModeration.categories.length > 0 && (
                                <p className="text-[9.5px] font-extrabold text-[#9A3412] mt-1.5 bg-[#FFFBEB] border border-amber-200 p-1 rounded">
                                  触发类别：{previewModeration.categories.map(c => {
                                    const policy = MODERATION_POLICY.find(p => p.id === c);
                                    return policy ? `「${policy.icon} ${policy.category}」` : `「${c}」`;
                                  }).join(' ')}
                                </p>
                              )}

                              {previewModeration.flagged && previewModeration.suggestion && (
                                <div className="mt-2 bg-white/70 border border-amber-300 p-2 rounded-lg">
                                  <p className="text-[9.5px] font-bold text-amber-900">💡 AI 建议：{previewModeration.suggestion}</p>
                                </div>
                              )}

                              <div className="mt-2.5 text-[11px] space-y-1.5 border-t border-dashed border-emerald-950/10 pt-2 font-sans">
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 font-bold shrink-0">🍉 瓜名:</span>
                                  <span className="font-bold text-emerald-950 break-all">
                                    {customMelonName || '(空)'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 font-bold shrink-0">💬 评语:</span>
                                  <span className="font-bold text-emerald-950 break-all leading-relaxed">
                                    {customComment || '(空)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white border-4 border-emerald-950 font-black text-sm rounded-2xl transition-all duration-200 shadow-[4px_4px_0px_0px_#4c0519] active:translate-y-[1px]"
                      >
                        📡 晒出一发，上大瓜热门广场！
                      </button>
                    </div>
                  </form>

                </motion.div>
              )}

              {/* SUMMER COOKBOOK NOTES CARD */}
              <div className="bg-amber-50 border-4 border-emerald-950 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#064e3b]">
                <h4 className="text-sm font-extrabold text-emerald-950 mb-2.5 flex items-center gap-1.5">
                  💡 知识小看板：如何科学地叩击西瓜？
                </h4>
                <ul className="space-y-1.5 text-xs text-emerald-900 font-medium">
                  <li className="flex items-start gap-1">
                    <span className="text-emerald-800">☝️</span> 
                    <span>把小手<strong>半握成拳头（用指节敲哦）</strong>，轻轻有节奏地敲敲西瓜的肚皮～</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-emerald-800">☝️</span> 
                    <span>听起来像<strong>拍拍小胸脯「咚咚」响</strong>——这是好瓜！熟了、多汁、甜甜的沙瓤！🍉</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-emerald-800">☝️</span> 
                    <span>听起来像<strong>弹脑门「铛铛」响</strong>——声音脆脆的是还生的小瓜；像<strong>拍小肚皮「噗噗」响</strong>还带颤音——可能熟过头啦，软软空空的～</span>
                  </li>
                </ul>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="panel-community"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
                  🍉 大家的甜甜瓜田
                </h2>
                <p className="text-xs text-emerald-800">
                  看看全国吃瓜小可爱们找到的"梦中情瓜"与"翻车白瓤瓜"！
                </p>
              </div>

              {/* 华强买瓜：今日行情看板 */}
              {marketIndex && marketIndex.totalRecords > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-emerald-950 rounded-2xl p-4 mb-6 shadow-[3px_3px_0px_0px_#064e3b]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      📊 这瓜保熟吗？今日行情
                    </h3>
                    <button
                      onClick={() => setShowMarketPanel(!showMarketPanel)}
                      className="text-[10px] font-black text-emerald-950 bg-white border-2 border-emerald-950 px-2 py-0.5 rounded-lg"
                    >
                      {showMarketPanel ? '收起 🔼' : '展开 🔽'}
                    </button>
                  </div>
                  {showMarketPanel && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {marketIndex.avgPrice !== null && (
                          <div className="bg-white border-2 border-emerald-950 rounded-xl p-2.5 text-center">
                            <p className="text-[9px] font-bold text-emerald-700">今日均价</p>
                            <p className="text-lg font-black text-rose-600">¥{marketIndex.avgPrice}</p>
                            <p className="text-[8px] text-emerald-600">
                              元/市斤
                              {marketIndex.yesterday?.avgPrice != null && (
                                marketIndex.avgPrice! < marketIndex.yesterday.avgPrice
                                  ? ' 📉 比昨天便宜'
                                  : marketIndex.avgPrice! > marketIndex.yesterday.avgPrice
                                  ? ' 📈 比昨天贵了'
                                  : ' ➡️ 和昨天持平'
                              )}
                            </p>
                          </div>
                        )}
                        <div className="bg-white border-2 border-emerald-950 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-emerald-700">好瓜率</p>
                          <p className="text-lg font-black text-emerald-600">{marketIndex.ripeRate}%</p>
                          <p className="text-[8px] text-emerald-600">{marketIndex.totalRecords} 条瓜报</p>
                        </div>
                        <div className="bg-white border-2 border-emerald-950 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-emerald-700">生瓜蛋子率</p>
                          <p className={`text-lg font-black ${marketIndex.rawRate > 30 ? 'text-red-500' : 'text-amber-500'}`}>
                            {marketIndex.rawRate}%
                          </p>
                          <p className="text-[8px] text-emerald-600">{marketIndex.rawRate > 30 ? '⚠️ 避坑预警' : '还行'}</p>
                        </div>
                        <div className="bg-white border-2 border-emerald-950 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-emerald-700">🔪 今日萨日朗</p>
                          <p className="text-lg font-black text-rose-500">{Math.round(marketIndex.totalRecords * marketIndex.selfSplitRate / 100)}<span className="text-xs text-emerald-600">人</span></p>
                          <p className="text-[8px] text-emerald-600">自己劈瓜！萨日朗～</p>
                        </div>
                      </div>
                      <div className="bg-white border-2 border-dashed border-emerald-950/30 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-emerald-900">
                          💬 华强说：<span className="text-rose-600 italic">"{marketIndex.huaqiangComment}"</span>
                        </p>
                      </div>
                      {marketIndex.totalPriceReports > 0 && (
                        <p className="text-[9px] text-emerald-500/70 text-center mt-1">
                          🛡️ 以上数据来自 {marketIndex.totalPriceReports} 位瓜友的真实报价 · 离谱价格自动过滤 · 众人吃瓜众人信
                        </p>
                      )}
                      {marketIndex.cityStats && marketIndex.cityStats.length > 0 && (
                        <div className="bg-white border-2 border-emerald-950 rounded-xl p-3">
                          <p className="text-[10px] font-black text-emerald-950 mb-2">🏙️ 各城市瓜价一览</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {marketIndex.cityStats.map((cs: CityStat, i: number) => (
                              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center">
                                <p className="text-[10px] font-black text-emerald-900">{cs.city}</p>
                                <p className="text-sm font-black text-rose-600">¥{cs.avgPrice}<span className="text-[8px] text-emerald-600">/斤</span></p>
                                <p className="text-[8px] text-emerald-600">{cs.count}人报价</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 瓜价走势图 */}
              {marketIndex.priceHistory && marketIndex.priceHistory.length >= 2 && (
                <div className="mb-6">
                  <PriceChart data={marketIndex.priceHistory} />
                </div>
              )}

              {/* Feed List rendered natively */}
              <SquareFeed records={records} onLike={handleLikeRecord} onWhatsUp={handleWhatsUp} onDisputePrice={handleDisputePrice} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 备案信息 */}
      <footer className="flex items-center justify-center gap-4 py-6 border-t border-emerald-200/50">
        <a
          href={window.location.origin}
          className="text-[10px] text-emerald-500/50 hover:text-emerald-700 transition-colors font-medium"
        >
          {window.location.origin}
        </a>
        <span className="text-emerald-300/40 text-[10px]">|</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-emerald-600/60 hover:text-emerald-800 transition-colors font-medium"
        >
          粤ICP备2025508528号
        </a>
      </footer>

    </div>
  );
}
