import React, { useState, useMemo, useEffect } from 'react';
import supabaseService from '../services/apiService';
import { Series, Rarity, Card, CardType, User } from '../types';
import { CardView } from '../components/CardView';
import { ImageUpload } from '../components/ImageUpload';
import { AdminStats } from '../components/AdminStats';

// Generate a valid UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type Tab = 'DASHBOARD' | 'SERIES' | 'CARDS' | 'MANAGE_SERIES' | 'MANAGE_CARDS' | 'USERS';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  
  // Series State
  const [seriesName, setSeriesName] = useState('');
  const [seriesDesc, setSeriesDesc] = useState('');
  const [seriesSetting, setSeriesSetting] = useState('');
  const [seriesActive, setSeriesActive] = useState(true);
  const [seriesImage, setSeriesImage] = useState('');
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  
  // Card State
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardLore, setCardLore] = useState('');
  const [cardType, setCardType] = useState<CardType>(CardType.CHARACTER);
  const [cardRarity, setCardRarity] = useState<Rarity>(Rarity.COMMON);
  const [cardAtt, setCardAtt] = useState(1);
  const [cardDef, setCardDef] = useState(1);
  const [cardImg, setCardImg] = useState('');
  const [cardAbilities, setCardAbilities] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  // Filter state for manage cards
  const [filterSeriesId, setFilterSeriesId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const [msg, setMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Users from Supabase (async)
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Series and Cards from Supabase
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Load series and cards from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [series, cards] = await Promise.all([
          supabaseService.getSeries(),
          supabaseService.getCards(),
        ]);
        setAllSeries(series);
        setAllCards(cards);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [refreshKey]);
  
  // Charger les utilisateurs depuis Supabase (sans les collections pour la performance)
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const [users, cardCounts] = await Promise.all([
          supabaseService.getUsers(),
          supabaseService.getUsersCardCounts()
        ]);
        // Assigner le nombre de cartes à chaque utilisateur
        setSupabaseUsers(users.map(user => ({ 
          ...user, 
          collection: Array(cardCounts[user.id] || 0).fill('') // Fake array pour le compteur
        })));
      } catch (error) {
        console.error('Error loading users from Supabase:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [refreshKey]);
  
  // Cache des collections chargées
  const [loadedCollections, setLoadedCollections] = useState<Record<string, string[]>>({});
  
  // Charger la collection d'un utilisateur à la demande
  const loadUserCollection = async (userId: string): Promise<string[]> => {
    if (loadedCollections[userId]) {
      return loadedCollections[userId];
    }
    const collection = await supabaseService.getUserCollection(userId);
    setLoadedCollections(prev => ({ ...prev, [userId]: collection }));
    // Mettre à jour l'utilisateur dans la liste
    setSupabaseUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, collection } : u
    ));
    return collection;
  };

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return supabaseUsers;
    const search = userSearchTerm.toLowerCase();
    return supabaseUsers.filter(u => 
      u.username?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  }, [supabaseUsers, userSearchTerm]);

  const filteredCards = useMemo(() => {
    let result = allCards;
    if (filterSeriesId) {
      result = result.filter(c => c.seriesId === filterSeriesId);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search)
      );
    }
    return result;
  }, [allCards, filterSeriesId, searchTerm]);

  const showMessage = (message: string, isError = false) => {
    setMsg(isError ? `⚠️ ${message}` : message);
    setTimeout(() => setMsg(''), 3000);
  };

  const refresh = () => setRefreshKey(prev => prev + 1);

  // === SERIES CRUD ===
  const resetSeriesForm = () => {
    setSeriesName('');
    setSeriesDesc('');
    setSeriesSetting('');
    setSeriesActive(true);
    setSeriesImage('');
    setEditingSeriesId(null);
  };

  const loadSeriesForEdit = (series: Series) => {
    setSeriesName(series.name);
    setSeriesDesc(series.description);
    setSeriesSetting(series.setting || '');
    setSeriesActive(series.isActive);
    setSeriesImage(series.coverImage || '');
    setEditingSeriesId(series.id);
    setActiveTab('SERIES');
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    const series: Series = {
      id: editingSeriesId || generateUUID(),
      name: seriesName,
      description: seriesDesc,
      setting: seriesSetting,
      totalCards: editingSeriesId 
        ? allCards.filter(c => c.seriesId === editingSeriesId).length 
        : 0,
      coverImage: seriesImage || `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400`,
      releaseDate: new Date().toISOString().split('T')[0],
      isActive: seriesActive,
    };
    
    try {
      if (editingSeriesId) {
        await supabaseService.updateSeries(editingSeriesId, series);
      } else {
        await supabaseService.createSeries(series);
      }
      showMessage(editingSeriesId ? '🏰 Campagne modifiée !' : '🏰 Campagne créée !');
      resetSeriesForm();
      refresh();
    } catch (error) {
      console.error('Error saving series:', error);
      showMessage('Erreur lors de la sauvegarde de la campagne', true);
    }
  };

  const handleDeleteSeries = async (seriesId: string, seriesName: string) => {
    if (confirm(`⚠️ Supprimer la campagne "${seriesName}" et toutes ses cartes ?`)) {
      try {
        await supabaseService.deleteSeries(seriesId);
        showMessage('🗑️ Campagne supprimée');
        refresh();
      } catch (error) {
        console.error('Error deleting series:', error);
        showMessage('Erreur lors de la suppression', true);
      }
    }
  };

  // === CARD CRUD ===
  const resetCardForm = () => {
    setCardName('');
    setCardTitle('');
    setCardDesc('');
    setCardLore('');
    setCardType(CardType.CHARACTER);
    setCardRarity(Rarity.COMMON);
    setCardAtt(1);
    setCardDef(1);
    setCardImg('');
    setCardAbilities('');
    setEditingCardId(null);
    setSelectedSeriesId('');
  };

  const loadCardForEdit = (card: Card) => {
    setCardName(card.name);
    setCardTitle(card.title || '');
    setCardDesc(card.description);
    setCardLore(card.lore || '');
    setCardType(card.cardType);
    setCardRarity(card.rarity);
    setCardAtt(card.attack || 0);
    setCardDef(card.defense || 0);
    setCardImg(card.imageUrl);
    setCardAbilities(card.abilities?.join(', ') || '');
    setSelectedSeriesId(card.seriesId);
    setEditingCardId(card.id);
    setActiveTab('CARDS');
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeriesId) {
      showMessage('Veuillez sélectionner une campagne.', true);
      return;
    }
    const card: Card = {
      id: editingCardId || generateUUID(),
      seriesId: selectedSeriesId,
      name: cardName,
      title: cardTitle || undefined,
      description: cardDesc,
      lore: cardLore || undefined,
      cardType: cardType,
      rarity: cardRarity,
      attack: cardAtt,
      defense: cardDef,
      abilities: cardAbilities ? cardAbilities.split(',').map(a => a.trim()) : undefined,
      imageUrl: cardImg || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400`
    };
    
    try {
      if (editingCardId) {
        await supabaseService.updateCard(editingCardId, card);
      } else {
        await supabaseService.createCard(card);
      }
      showMessage(editingCardId ? '⚔️ Carte modifiée !' : '⚔️ Carte créée !');
      resetCardForm();
      refresh();
    } catch (error) {
      console.error('Error saving card:', error);
      showMessage('Erreur lors de la sauvegarde de la carte', true);
    }
  };

  const handleDeleteCard = async (cardId: string, cardName: string) => {
    if (confirm(`⚠️ Supprimer la carte "${cardName}" ?`)) {
      try {
        await supabaseService.deleteCard(cardId);
        showMessage('🗑️ Carte supprimée');
        refresh();
      } catch (error) {
        console.error('Error deleting card:', error);
        showMessage('Erreur lors de la suppression', true);
      }
    }
  };

  const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.LEGENDARY: return 'text-amber-400';
      case Rarity.EPIC: return 'text-purple-400';
      case Rarity.RARE: return 'text-blue-400';
      case Rarity.UNCOMMON: return 'text-green-400';
      default: return 'text-stone-400';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-medieval font-bold text-valthera-200 mb-2">🛡️ Panneau d'Administration</h1>
      <p className="text-valthera-500 mb-8">Gérez les campagnes et les cartes de Valthera</p>

      {msg && (
        <div className={`p-4 rounded-lg mb-6 border ${msg.includes('⚠️') ? 'bg-blood-600/20 text-blood-400 border-blood-600/30' : 'bg-forest-600/20 text-forest-500 border-forest-600/30'}`}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-valthera-700 pb-4">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'DASHBOARD' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          📊 Dashboard
        </button>
        <button 
          onClick={() => { setActiveTab('SERIES'); resetSeriesForm(); }}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'SERIES' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          🏰 {editingSeriesId ? 'Modifier Campagne' : 'Nouvelle Campagne'}
        </button>
        <button 
          onClick={() => { setActiveTab('CARDS'); resetCardForm(); }}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'CARDS' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          ⚔️ {editingCardId ? 'Modifier Carte' : 'Nouvelle Carte'}
        </button>
        <button 
          onClick={() => setActiveTab('MANAGE_SERIES')}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'MANAGE_SERIES' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          📋 Campagnes ({allSeries.length})
        </button>
        <button 
          onClick={() => setActiveTab('MANAGE_CARDS')}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'MANAGE_CARDS' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          🃏 Cartes ({allCards.length})
        </button>
        <button 
          onClick={() => setActiveTab('USERS')}
          className={`pb-2 px-4 transition-colors font-medium rounded-t-lg ${activeTab === 'USERS' ? 'bg-valthera-700 text-valthera-200' : 'text-valthera-500 hover:text-valthera-300'}`}
        >
          👥 Utilisateurs ({supabaseUsers.length})
        </button>
      </div>

      {/* DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <AdminStats users={supabaseUsers} />
      )}

      {/* SERIES FORM */}
      {activeTab === 'SERIES' && (
        <div className="bg-valthera-800 p-8 rounded-2xl shadow-xl border border-valthera-700">
          <form onSubmit={handleSaveSeries} className="space-y-6">
            {editingSeriesId && (
              <div className="bg-valthera-700/50 p-3 rounded-lg border border-valthera-600 flex justify-between items-center">
                <span className="text-valthera-300">✏️ Modification de la campagne</span>
                <button type="button" onClick={resetSeriesForm} className="text-blood-400 hover:text-blood-300 text-sm">
                  Annuler
                </button>
              </div>
            )}
            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Nom de la campagne</label>
              <input type="text" required value={seriesName} onChange={e => setSeriesName(e.target.value)} 
                placeholder="Ex: Les Ombres de Kael'Thar"
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>
            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Description</label>
              <textarea required value={seriesDesc} onChange={e => setSeriesDesc(e.target.value)} 
                placeholder="Décrivez l'intrigue principale de cette campagne..."
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 h-24 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>
            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Contexte / Setting</label>
              <input type="text" value={seriesSetting} onChange={e => setSeriesSetting(e.target.value)} 
                placeholder="Ex: Royaume déchu, terres corrompues par la nécromancie"
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>
            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Image de couverture</label>
              <ImageUpload
                value={seriesImage}
                onChange={setSeriesImage}
                aspectRatio="cover"
              />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" checked={seriesActive} onChange={e => setSeriesActive(e.target.checked)} 
                className="w-5 h-5 rounded border-valthera-600 bg-valthera-900 text-valthera-500 focus:ring-valthera-400" />
              <label htmlFor="isActive" className="text-valthera-300">Campagne actuellement en cours</label>
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 py-3 rounded-lg font-bold transition-all border border-valthera-400/50">
              🏰 {editingSeriesId ? 'Sauvegarder les modifications' : 'Créer la Campagne'}
            </button>
          </form>
        </div>
      )}

      {/* CARDS FORM */}
      {activeTab === 'CARDS' && (
        <div className="bg-valthera-800 p-8 rounded-2xl shadow-xl border border-valthera-700">
          <form onSubmit={handleSaveCard} className="space-y-6">
            {editingCardId && (
              <div className="bg-valthera-700/50 p-3 rounded-lg border border-valthera-600 flex justify-between items-center">
                <span className="text-valthera-300">✏️ Modification de la carte</span>
                <button type="button" onClick={resetCardForm} className="text-blood-400 hover:text-blood-300 text-sm">
                  Annuler
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">Campagne</label>
                <select required value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)} 
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none">
                  <option value="">-- Choisir une campagne --</option>
                  {allSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">Type de carte</label>
                <select value={cardType} onChange={e => setCardType(e.target.value as CardType)} 
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none">
                  {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">Nom</label>
                <input type="text" required value={cardName} onChange={e => setCardName(e.target.value)} 
                  placeholder="Ex: Aldric le Brave"
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
              </div>
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">Titre (optionnel)</label>
                <input type="text" value={cardTitle} onChange={e => setCardTitle(e.target.value)} 
                  placeholder="Ex: Paladin de l'Aube"
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Rareté</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(Rarity).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCardRarity(r)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cardRarity === r 
                      ? 'bg-valthera-500 text-valthera-900 border border-valthera-400' 
                      : 'bg-valthera-900 text-valthera-400 border border-valthera-700 hover:border-valthera-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Description courte</label>
              <textarea required value={cardDesc} onChange={e => setCardDesc(e.target.value)} 
                placeholder="Description visible sur la carte..."
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 h-20 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>

            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Lore / Histoire (optionnel)</label>
              <textarea value={cardLore} onChange={e => setCardLore(e.target.value)} 
                placeholder="Historique détaillé du personnage, créature ou lieu..."
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 h-20 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">⚔️ Attaque</label>
                <input type="number" required min="0" max="20" value={cardAtt} onChange={e => setCardAtt(parseInt(e.target.value))} 
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-valthera-300 mb-1 font-medium">🛡️ Défense</label>
                <input type="number" required min="0" max="20" value={cardDef} onChange={e => setCardDef(parseInt(e.target.value))} 
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Capacités (séparées par des virgules)</label>
              <input type="text" value={cardAbilities} onChange={e => setCardAbilities(e.target.value)} 
                placeholder="Ex: Frappe Sacrée, Aura de Protection, Vol"
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600" />
            </div>

            <div>
              <label className="block text-sm text-valthera-300 mb-1 font-medium">Image de la carte</label>
              <ImageUpload
                value={cardImg}
                onChange={setCardImg}
                aspectRatio="card"
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 py-3 rounded-lg font-bold transition-all border border-valthera-400/50">
              ⚔️ {editingCardId ? 'Sauvegarder les modifications' : 'Ajouter la Carte'}
            </button>
          </form>
        </div>
      )}

      {/* MANAGE SERIES */}
      {activeTab === 'MANAGE_SERIES' && (
        <div className="bg-valthera-800 p-8 rounded-2xl shadow-xl border border-valthera-700">
          <h2 className="text-xl font-bold text-valthera-200 mb-6">📋 Liste des Campagnes</h2>
          {allSeries.length === 0 ? (
            <p className="text-valthera-500 text-center py-8">Aucune campagne créée</p>
          ) : (
            <div className="space-y-4">
              {allSeries.map(series => {
                const cardsCount = allCards.filter(c => c.seriesId === series.id).length;
                return (
                  <div key={series.id} className="bg-valthera-900 rounded-xl p-4 border border-valthera-700 flex flex-col md:flex-row items-start md:items-center gap-4">
                    {series.coverImage && (
                      <img src={series.coverImage} alt={series.name} className="w-20 h-14 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-valthera-200">{series.name}</h3>
                        {series.isActive && (
                          <span className="text-xs bg-forest-600/30 text-forest-400 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-valthera-400 text-sm line-clamp-1">{series.description}</p>
                      <p className="text-valthera-500 text-xs mt-1">🃏 {cardsCount} cartes • 📅 {series.releaseDate}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadSeriesForEdit(series)}
                        className="px-4 py-2 bg-valthera-700 hover:bg-valthera-600 text-valthera-200 rounded-lg text-sm transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteSeries(series.id, series.name)}
                        className="px-4 py-2 bg-blood-600/30 hover:bg-blood-600/50 text-blood-400 rounded-lg text-sm transition-colors"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANAGE CARDS */}
      {activeTab === 'MANAGE_CARDS' && (
        <div className="bg-valthera-800 p-8 rounded-2xl shadow-xl border border-valthera-700">
          <h2 className="text-xl font-bold text-valthera-200 mb-6">🃏 Liste des Cartes</h2>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher une carte..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100 placeholder-valthera-600"
              />
            </div>
            <select
              value={filterSeriesId}
              onChange={e => setFilterSeriesId(e.target.value)}
              className="bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100"
            >
              <option value="">Toutes les campagnes</option>
              {allSeries.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {filteredCards.length === 0 ? (
            <p className="text-valthera-500 text-center py-8">Aucune carte trouvée</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredCards.map(card => {
                const series = allSeries.find(s => s.id === card.seriesId);
                return (
                  <div key={card.id} className="bg-valthera-900 rounded-xl p-4 border border-valthera-700 flex flex-col items-center gap-3">
                    <CardView card={card} size="md" />
                    <div className="w-full text-center">
                      <h3 className="text-sm font-bold text-valthera-200 truncate">{card.name}</h3>
                      {card.title && <p className="text-valthera-400 text-xs truncate">{card.title}</p>}
                      <p className={`text-xs font-medium mt-1 ${getRarityColor(card.rarity)}`}>{card.rarity}</p>
                      <p className="text-valthera-500 text-xs mt-1">{series?.name || 'N/A'}</p>
                      <div className="flex justify-center gap-2 mt-3">
                        <button
                          onClick={() => loadCardForEdit(card)}
                          className="px-4 py-1.5 bg-valthera-700 hover:bg-valthera-600 text-valthera-200 rounded-lg text-xs transition-colors"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id, card.name)}
                          className="px-4 py-1.5 bg-blood-600/30 hover:bg-blood-600/50 text-blood-400 rounded-lg text-xs transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* USERS MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="bg-valthera-800 p-8 rounded-2xl shadow-xl border border-valthera-700">
          <h2 className="text-xl font-bold text-valthera-200 mb-6">👥 Gestion des Utilisateurs</h2>
          
          {loadingUsers ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-valthera-400"></div>
              <p className="text-valthera-500 mt-2">Chargement des utilisateurs...</p>
            </div>
          ) : supabaseUsers.length === 0 ? (
            <p className="text-valthera-500 text-center py-8">Aucun utilisateur inscrit</p>
          ) : (
            <div className="overflow-x-auto">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                  className="w-full max-w-md bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100 placeholder-valthera-600"
                />
              </div>
              
              <table className="w-full">
                <thead>
                  <tr className="border-b border-valthera-700">
                    <th className="text-left text-valthera-400 text-sm font-medium py-3 px-4">Utilisateur</th>
                    <th className="text-left text-valthera-400 text-sm font-medium py-3 px-4">Email</th>
                    <th className="text-center text-valthera-400 text-sm font-medium py-3 px-4">Cartes</th>
                    <th className="text-center text-valthera-400 text-sm font-medium py-3 px-4">Dernière activité</th>
                    <th className="text-center text-valthera-400 text-sm font-medium py-3 px-4">Inscription</th>
                    <th className="text-center text-valthera-400 text-sm font-medium py-3 px-4">Statut</th>
                    <th className="text-center text-valthera-400 text-sm font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const isAdmin = user.isAdmin || (user.email && ['alexandre.bailleu@gmail.com'].includes(user.email));
                    const totalCards = user.collection?.length || 0;
                    return (
                      <tr key={user.id} className="border-b border-valthera-700/50 hover:bg-valthera-700/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-valthera-700 flex items-center justify-center text-valthera-300">
                                {user.username?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-valthera-200">{user.username || 'Anonyme'}</p>
                              <p className="text-xs text-valthera-500">ID: {user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-valthera-300 text-sm">{user.email || 'N/A'}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-valthera-200 font-medium">{totalCards}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-valthera-400 text-sm">
                          {user.lastBoosterDate ? new Date(user.lastBoosterDate).toLocaleDateString('fr-FR') : 'Jamais'}
                        </td>
                        <td className="py-4 px-4 text-center text-valthera-400 text-sm">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isAdmin ? (
                            <span className="text-xs bg-legendary/30 text-legendary px-2 py-1 rounded-full">Admin</span>
                          ) : user.isBanned ? (
                            <span className="text-xs bg-blood-600/30 text-blood-400 px-2 py-1 rounded-full">Banni</span>
                          ) : (
                            <span className="text-xs bg-valthera-700 text-valthera-300 px-2 py-1 rounded-full">Membre</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                const details = `
Utilisateur: ${user.username || 'N/A'}
Email: ${user.email || 'N/A'}
ID: ${user.id}
Cartes collectionnées: ${totalCards}
Dernière activité: ${user.lastBoosterDate ? new Date(user.lastBoosterDate).toLocaleString('fr-FR') : 'Jamais'}
Inscrit le: ${user.createdAt ? new Date(user.createdAt).toLocaleString('fr-FR') : 'N/A'}
Statut: ${isAdmin ? 'Administrateur' : user.isBanned ? 'Banni' : 'Membre'}
                                `.trim();
                                alert(details);
                              }}
                              className="px-3 py-1.5 bg-valthera-700 hover:bg-valthera-600 text-valthera-200 rounded-lg text-xs transition-colors"
                            >
                              👁️ Voir
                            </button>
                            <button
                              onClick={async () => {
                                const countStr = prompt('Combien de boosters voulez-vous donner ?', '1');
                                if (countStr) {
                                  const count = parseInt(countStr, 10);
                                  if (count > 0 && count <= 10) {
                                    const success = await supabaseService.giveBooster(user.id, count);
                                    if (success) {
                                      setMsg(`${count} booster(s) donné(s) à ${user.username}`);
                                      setRefreshKey(k => k + 1);
                                    } else {
                                      setMsg('Erreur lors de l\'ajout du booster');
                                    }
                                  } else {
                                    alert('Veuillez entrer un nombre entre 1 et 10');
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-legendary/30 hover:bg-legendary/50 text-legendary rounded-lg text-xs transition-colors"
                            >
                              🎁 Booster
                            </button>
                            {!isAdmin && (
                              <button
                                onClick={async () => {
                                  const action = user.isBanned ? 'débannir' : 'bannir';
                                  if (confirm(`Voulez-vous vraiment ${action} ${user.username} ?`)) {
                                    const success = await supabaseService.banUser(user.id, !user.isBanned);
                                    if (success) {
                                      setMsg(`Utilisateur ${user.isBanned ? 'débanni' : 'banni'} avec succès`);
                                      setRefreshKey(k => k + 1);
                                    } else {
                                      setMsg('Erreur lors de l\'opération');
                                    }
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  user.isBanned 
                                    ? 'bg-forest-600/30 hover:bg-forest-600/50 text-forest-400' 
                                    : 'bg-blood-600/30 hover:bg-blood-600/50 text-blood-400'
                                }`}
                              >
                                {user.isBanned ? '✓ Débannir' : '🚫 Bannir'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
