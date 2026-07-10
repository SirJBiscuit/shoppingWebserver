import React, { useState, useEffect } from 'react';
import { 
  Palette, ShoppingCart, FileText, Frame, Image as ImageIcon, 
  Sparkles, Check, Lock, Crown 
} from 'lucide-react';

function CustomizationHub() {
  const [activeTab, setActiveTab] = useState('themes');
  const [customization, setCustomization] = useState(null);
  const [themes, setThemes] = useState([]);
  const [cartSkins, setCartSkins] = useState([]);
  const [userLevel, setUserLevel] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchCustomization();
    fetchThemes();
    fetchCartSkins();
  }, []);

  const fetchCustomization = async () => {
    try {
      const response = await fetch('/api/cosmetics/customization', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCustomization(data.customization);
    } catch (error) {
      console.error('Error fetching customization:', error);
    }
  };

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/cosmetics/themes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setThemes(data.themes);
    } catch (error) {
      console.error('Error fetching themes:', error);
    }
  };

  const fetchCartSkins = async () => {
    try {
      const response = await fetch('/api/cosmetics/cart-skins', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCartSkins(data.skins);
    } catch (error) {
      console.error('Error fetching cart skins:', error);
    }
  };

  const activateTheme = async (themeId) => {
    try {
      await fetch('/api/cosmetics/themes/activate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ themeId })
      });
      fetchCustomization();
      fetchThemes();
    } catch (error) {
      console.error('Error activating theme:', error);
    }
  };

  const activateCartSkin = async (skinId) => {
    try {
      await fetch('/api/cosmetics/cart-skins/activate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skinId })
      });
      fetchCustomization();
      fetchCartSkins();
    } catch (error) {
      console.error('Error activating cart skin:', error);
    }
  };

  const tabs = [
    { id: 'themes', label: 'Color Themes', icon: Palette },
    { id: 'cart', label: 'Cart Skins', icon: ShoppingCart },
    { id: 'notes', label: 'Note Styles', icon: FileText },
    { id: 'borders', label: 'Borders', icon: Frame },
    { id: 'backgrounds', label: 'Backgrounds', icon: ImageIcon },
    { id: 'animations', label: 'Animations', icon: Sparkles }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Customization Hub</h1>
        <p className="text-gray-600">
          Personalize your Listzy experience
          {isPremium && <span className="ml-2 text-yellow-600 font-semibold">⭐ Premium</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {activeTab === 'themes' && (
          <ThemesTab 
            themes={themes} 
            activeThemeId={customization?.active_theme_id}
            onActivate={activateTheme}
            userLevel={userLevel}
            isPremium={isPremium}
          />
        )}
        
        {activeTab === 'cart' && (
          <CartSkinsTab 
            skins={cartSkins} 
            activeSkinId={customization?.active_cart_skin_id}
            onActivate={activateCartSkin}
            userLevel={userLevel}
            isPremium={isPremium}
          />
        )}

        {activeTab === 'notes' && (
          <ComingSoonTab type="Note Styles" />
        )}

        {activeTab === 'borders' && (
          <ComingSoonTab type="Borders" />
        )}

        {activeTab === 'backgrounds' && (
          <ComingSoonTab type="Backgrounds" />
        )}

        {activeTab === 'animations' && (
          <ComingSoonTab type="Animations" />
        )}
      </div>
    </div>
  );
}

function ThemesTab({ themes, activeThemeId, onActivate, userLevel, isPremium }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Color Themes</h2>
      <p className="text-gray-600 mb-6">
        Choose a color theme to personalize your app
      </p>

      <div className="grid grid-cols-3 gap-6">
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={theme.id === activeThemeId}
            isUnlocked={theme.unlocked}
            onActivate={() => onActivate(theme.id)}
            userLevel={userLevel}
            isPremium={isPremium}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, isActive, isUnlocked, onActivate, userLevel, isPremium }) {
  const canUnlock = userLevel >= theme.min_level && (!theme.premium_only || isPremium);

  return (
    <div className={`relative border-2 rounded-lg p-4 transition-all ${
      isActive 
        ? 'border-blue-500 shadow-lg'
        : isUnlocked
        ? 'border-gray-300 hover:border-blue-300 hover:shadow-md cursor-pointer'
        : 'border-gray-200 opacity-50'
    }`}>
      {/* Lock Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
          <Lock className="text-gray-600" size={32} />
        </div>
      )}

      {/* Premium Badge */}
      {theme.premium_only && (
        <div className="absolute top-2 right-2">
          <Crown className="text-yellow-500" size={20} />
        </div>
      )}

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Check size={12} />
          ACTIVE
        </div>
      )}

      {/* Theme Preview */}
      <div className="mb-4">
        <div className="h-24 rounded-lg overflow-hidden" style={{
          background: theme.is_gradient 
            ? `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`
            : theme.primary_color
        }}>
          <div className="h-full flex items-center justify-center">
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: theme.primary_color }}
              ></div>
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: theme.secondary_color }}
              ></div>
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: theme.accent_color }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-1">{theme.name}</h3>
        <p className="text-sm text-gray-600">{theme.description}</p>
      </div>

      {/* Features */}
      {(theme.has_particles || theme.has_animation) && isUnlocked && (
        <div className="flex gap-2 mb-4">
          {theme.has_particles && (
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
              Particles
            </span>
          )}
          {theme.has_animation && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              Animated
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      {isUnlocked ? (
        <button
          onClick={onActivate}
          disabled={isActive}
          className={`w-full py-2 rounded-lg font-semibold transition-all ${
            isActive
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isActive ? 'Active' : 'Activate'}
        </button>
      ) : (
        <div className="text-center text-sm text-gray-500">
          {!canUnlock && theme.premium_only && !isPremium ? (
            <span className="text-yellow-600 font-semibold">Premium Only</span>
          ) : (
            <span>Unlock at Level {theme.min_level}</span>
          )}
        </div>
      )}
    </div>
  );
}

function CartSkinsTab({ skins, activeSkinId, onActivate, userLevel, isPremium }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Shopping Cart Skins</h2>
      <p className="text-gray-600 mb-6">
        Customize your shopping cart appearance
      </p>

      <div className="grid grid-cols-4 gap-6">
        {skins.map(skin => (
          <CartSkinCard
            key={skin.id}
            skin={skin}
            isActive={skin.id === activeSkinId}
            isUnlocked={skin.unlocked}
            onActivate={() => onActivate(skin.id)}
            userLevel={userLevel}
            isPremium={isPremium}
          />
        ))}
      </div>
    </div>
  );
}

function CartSkinCard({ skin, isActive, isUnlocked, onActivate, userLevel, isPremium }) {
  const canUnlock = userLevel >= skin.min_level && (!skin.premium_only || isPremium);

  return (
    <div className={`relative border-2 rounded-lg p-4 transition-all ${
      isActive 
        ? 'border-blue-500 shadow-lg'
        : isUnlocked
        ? 'border-gray-300 hover:border-blue-300 hover:shadow-md cursor-pointer'
        : 'border-gray-200 opacity-50'
    }`}>
      {/* Lock Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
          <Lock className="text-gray-600" size={32} />
        </div>
      )}

      {/* Premium Badge */}
      {skin.premium_only && (
        <div className="absolute top-2 right-2">
          <Crown className="text-yellow-500" size={16} />
        </div>
      )}

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Check size={12} />
          ACTIVE
        </div>
      )}

      {/* Cart Preview */}
      <div className="mb-4 bg-gray-100 rounded-lg p-4 h-32 flex items-center justify-center">
        <ShoppingCart className="text-gray-400" size={48} />
      </div>

      {/* Skin Info */}
      <div className="mb-4">
        <h3 className="font-bold mb-1">{skin.name}</h3>
        <p className="text-xs text-gray-600">{skin.description}</p>
      </div>

      {/* Features */}
      {(skin.animation_type || skin.particle_effect) && isUnlocked && (
        <div className="flex flex-wrap gap-1 mb-4">
          {skin.animation_type && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              {skin.animation_type}
            </span>
          )}
          {skin.particle_effect && (
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
              {skin.particle_effect}
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      {isUnlocked ? (
        <button
          onClick={onActivate}
          disabled={isActive}
          className={`w-full py-2 rounded-lg font-semibold transition-all text-sm ${
            isActive
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isActive ? 'Active' : 'Activate'}
        </button>
      ) : (
        <div className="text-center text-xs text-gray-500">
          {!canUnlock && skin.premium_only && !isPremium ? (
            <span className="text-yellow-600 font-semibold">Premium Only</span>
          ) : (
            <span>Level {skin.min_level}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ComingSoonTab({ type }) {
  return (
    <div className="text-center py-12">
      <Sparkles className="mx-auto mb-4 text-gray-400" size={64} />
      <h2 className="text-2xl font-bold mb-2">{type} Coming Soon!</h2>
      <p className="text-gray-600">
        We're working on bringing you amazing {type.toLowerCase()} customization options.
      </p>
    </div>
  );
}

export default CustomizationHub;
