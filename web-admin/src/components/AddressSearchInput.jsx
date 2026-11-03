import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation, Compass } from 'lucide-react';
import { apiRegistry } from '../services/ApiClient.js';

export default function AddressSearchInput({
  label,
  icon3D,
  currentLocation,
  onSelectLocation,
  placeholder = 'Nhập số nhà, tên đường hoặc địa danh...',
  disabled = false,
  accentColor = '#00b14f',
  extraActionBtn = null,
  onStartMapPick = null,
  isMapPickingActive = false,
  themeMode = 'light'
}) {
  const [query, setQuery] = useState(currentLocation?.name || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);

  // Sync displayed query when currentLocation changes from external action (e.g. GPS, map click)
  useEffect(() => {
    if (!isFocused && currentLocation?.name) {
      setQuery(currentLocation.name);
    }
  }, [currentLocation, isFocused]);

  // Debounced geocoding search
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await apiRegistry.map.searchLocations(trimmed);
        setSuggestions(results || []);
      } catch (err) {
        console.warn('Geocoding search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsFocused(false);
        if (currentLocation?.name) {
          setQuery(currentLocation.name);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [currentLocation]);

  const handleSelect = (item) => {
    setQuery(item.name);
    setIsOpen(false);
    setIsFocused(false);
    onSelectLocation(item);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery('');
    setSuggestions([]);
    setIsOpen(true);
  };

  return (
    <div className="address-autocomplete-container" ref={wrapperRef}>
      {/* Header Row: Label & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label
          className="form-label"
          style={{
            fontSize: '0.75rem',
            marginBottom: 0,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700
          }}
        >
          {icon3D ? (
            <img src={icon3D} alt={label} style={{ width: 16, height: 16, objectFit: 'contain' }} />
          ) : (
            <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
          )}
          <span>{label}</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {extraActionBtn}

          {onStartMapPick && (
            <button
              type="button"
              onClick={onStartMapPick}
              disabled={disabled}
              style={{
                background: isMapPickingActive ? accentColor : 'rgba(100, 116, 139, 0.1)',
                color: isMapPickingActive ? '#ffffff' : (themeMode === 'dark' ? '#94a3b8' : '#475569'),
                border: `1px solid ${isMapPickingActive ? accentColor : 'rgba(100, 116, 139, 0.25)'}`,
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Nhấn để click trực tiếp vào vị trí bất kỳ trên bản đồ"
            >
              <Compass className="w-3 h-3" />
              <span>{isMapPickingActive ? 'Đang chấm trên map...' : 'Chấm trên map'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Search Box */}
      <div className="address-search-box">
        <span className="address-search-icon-left">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </span>

        <input
          type="text"
          className="address-search-input"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setIsFocused(false);
            }
          }}
        />

        {query && !disabled && (
          <button
            type="button"
            className="address-search-clear-btn"
            onClick={handleClear}
            title="Xóa tìm kiếm"
            aria-label="Xóa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="address-dropdown-popover">
          {isSearching && suggestions.length === 0 && (
            <div style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" style={{ color: accentColor }} />
              Đang tìm kiếm địa chỉ trên bản đồ TP.HCM & Việt Nam...
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && suggestions.length === 0 && (
            <div style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              Không tìm thấy địa chỉ nào khớp với "{query}".<br />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                💡 Hãy thử gõ tên đường, số nhà hoặc bấm "Chấm trên map" để chọn trực tiếp.
              </span>
            </div>
          )}

          {suggestions.map((item) => (
            <div
              key={item.id}
              className="address-dropdown-item"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click registers
                handleSelect(item);
              }}
            >
              <div className="address-item-icon">
                <MapPin className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <div className="address-item-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="address-item-name">{item.name}</span>
                  <span className={`address-item-tag ${item.source === 'OSM' ? 'osm' : ''}`}>
                    {item.source === 'LOCAL' ? (item.category || 'Địa danh') : 'OSM Bản đồ'}
                  </span>
                </div>
                <div className="address-item-sub">{item.address}</div>
              </div>
            </div>
          ))}

          {/* Quick helpful tip at bottom of dropdown */}
          {suggestions.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid rgba(226, 232, 240, 0.4)', textAlign: 'right' }}>
              ✓ Đã kết nối OpenStreetMap Geocoding
            </div>
          )}
        </div>
      )}
    </div>
  );
}
