import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/apiService';
import { Rarity, Card } from '../types';

interface QRCodeShareProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeShare: React.FC<QRCodeShareProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);

  // Load cards from Supabase
  useEffect(() => {
    if (isOpen) {
      supabaseService.getCards().then(setAllCards);
    }
  }, [isOpen]);

  // Générer un ID unique pour la collection publique
  const shareId = useMemo(() => {
    if (!user) return '';
    // Encoder l'ID utilisateur en base64 pour créer un lien partageable
    return btoa(user.id).replace(/[+/=]/g, c => 
      c === '+' ? '-' : c === '/' ? '_' : ''
    );
  }, [user]);

  // URL de partage (à adapter selon le domaine de production)
  const shareUrl = useMemo(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/collection/${shareId}`;
  }, [shareId]);

  // Générer le QR Code via API Google Charts (gratuit, pas de dépendance)
  const qrCodeUrl = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}&bgcolor=1A0F08&color=C9A227`;
  }, [shareUrl]);

  // Stats pour le partage
  const stats = useMemo(() => {
    if (!user) return { total: 0, unique: 0, legendary: 0, epic: 0 };
    const ownedIds = new Set(user.collection);
    const ownedCards = allCards.filter(c => ownedIds.has(c.id));
    
    return {
      total: user.collection.length,
      unique: ownedIds.size,
      legendary: ownedCards.filter(c => c.rarity === Rarity.LEGENDARY).length,
      epic: ownedCards.filter(c => c.rarity === Rarity.EPIC).length,
    };
  }, [user, allCards]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `🏰 Ma collection Valthera TCG : ${stats.unique} cartes uniques dont ${stats.legendary} Légendaires ! Venez voir ⚔️`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-valthera-800 rounded-2xl border border-valthera-600 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-valthera-700 to-valthera-800 p-6 border-b border-valthera-600">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-medieval font-bold text-valthera-200">📱 Partager ma Collection</h2>
              <p className="text-valthera-400 text-sm mt-1">Scannez le QR code ou partagez le lien</p>
            </div>
            <button
              onClick={onClose}
              className="text-valthera-400 hover:text-valthera-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-valthera-900 p-4 rounded-xl border border-valthera-600">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Collection" 
                className="w-48 h-48 rounded-lg"
              />
            </div>
          </div>

          {/* Stats Preview */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-valthera-900 rounded-lg p-3 border border-valthera-700">
              <div className="text-xl font-bold text-valthera-200">{stats.total}</div>
              <div className="text-[10px] text-valthera-500 uppercase">Total</div>
            </div>
            <div className="bg-valthera-900 rounded-lg p-3 border border-valthera-700">
              <div className="text-xl font-bold text-valthera-300">{stats.unique}</div>
              <div className="text-[10px] text-valthera-500 uppercase">Uniques</div>
            </div>
            <div className="bg-valthera-900 rounded-lg p-3 border border-amber-600/30">
              <div className="text-xl font-bold text-amber-400">{stats.legendary}</div>
              <div className="text-[10px] text-valthera-500 uppercase">Légend.</div>
            </div>
            <div className="bg-valthera-900 rounded-lg p-3 border border-purple-600/30">
              <div className="text-xl font-bold text-purple-400">{stats.epic}</div>
              <div className="text-[10px] text-valthera-500 uppercase">Épiques</div>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm text-valthera-400">Lien de partage</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-valthera-900 border border-valthera-600 rounded-lg px-3 py-2 text-valthera-300 text-sm"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  copied
                    ? 'bg-forest-600 text-white'
                    : 'bg-valthera-600 hover:bg-valthera-500 text-valthera-100'
                }`}
              >
                {copied ? '✓ Copié !' : '📋 Copier'}
              </button>
            </div>
          </div>

          {/* Social Share */}
          <div className="space-y-2">
            <label className="text-sm text-valthera-400">Partager sur</label>
            <div className="flex gap-3">
              <button
                onClick={handleShareTwitter}
                className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
              </button>
              <button
                onClick={handleShareFacebook}
                className="flex-1 bg-[#1877F2] hover:bg-[#166fe5] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-valthera-900/50 px-6 py-4 border-t border-valthera-700">
          <p className="text-valthera-500 text-xs text-center">
            💡 Les visiteurs pourront voir votre collection sans pouvoir la modifier
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeShare;
