import React, { useRef, useEffect, useState } from "react";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import "leaflet/dist/leaflet.css";
import "./MapaInteractivo.css";

import { MdGppGood } from "react-icons/md";
import { FaArrowAltCircleRight, FaArrowAltCircleUp } from "react-icons/fa";
import { Fade as Hamburger } from "hamburger-react";
import LogoSAFDfiremarshal from "../../images/MapaInteractivo/LogoSAFDfiremarshal.png";

const MapaInteractivo = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [markers, setMarkers] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);
  const [menuDesplegado, setMenuDesplegado] = useState(false);
  const [selectedMap, setSelectedMap] = useState("Estilo Atlas"); // Estado para el mapa seleccionado

  const Icons = {
    "SAED - SAPD": L.layerGroup(),
    "Zonas de riesgo": L.layerGroup(),
    "Inspecciones de seguridad": L.layerGroup(),
    "Incidentes Abiertos": L.layerGroup(),
    "Incidentes Cerrados": L.layerGroup(),
    "Casos aislados": L.layerGroup(),
    "Operaciones de rescate": L.layerGroup(),
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(process.env.PUBLIC_URL + "/markers.json");
        const markersData = await response.json();
        const newMarkers = {};
        markersData.forEach((marker) => {
          createMarker(
            marker.group,
            marker.lat,
            marker.lng,
            marker.iconNum,
            marker.popupText,
            newMarkers
          );
        });
        setMarkers(newMarkers);
      } catch (error) {
        console.error("Error fetching markers:", error);
      }
    };

    fetchData();

    const center_x = 117.3;
    const center_y = 172.8;
    const scale_x = 0.02072;
    const scale_y = 0.0205;

    const transformation = new L.Transformation(
      scale_x,
      center_x,
      scale_y,
      center_y
    );

    const CUSTOM_CRS = L.extend({}, L.CRS.Simple, {
      projection: L.Projection.LonLat,
      transformation: transformation,
      scale: function (zoom) {
        return Math.pow(2, zoom);
      },
      zoom: function (scale) {
        return Math.log(scale) / Math.LN2;
      },
    });

    const AtlasStyle = L.tileLayer(
      "ImgMapInteractive/styleAtlas/{z}/{x}/{y}.webp",
      {
        minZoom: 0,
        maxZoom: 5,
        noWrap: true,
        continuousWorld: false,
        attribution: "SAFD",
        id: "styleAtlas map",
      }
    );

    const SateliteStyle = L.tileLayer(
      "ImgMapInteractive/styleSatelite/{z}/{x}/{y}.webp",
      {
        minZoom: 0,
        maxZoom: 5,
        noWrap: true,
        continuousWorld: false,
        attribution: "SAFD",
        id: "styleSatelite map",
      }
    );

    const createMarker = (
      group,
      lat,
      lng,
      iconNum,
      popupText,
      markersObject
    ) => {
      const icon = L.icon({
        iconUrl: `${process.env.PUBLIC_URL}/ImgMapInteractive/blips/${iconNum}.webp`,
        iconSize: [32, 37],
        iconAnchor: [30, 27],
        popupAnchor: [-10, -27],
      });

      const popupContent = (
        <div className="popup-container">
          <div className="popup-title">
            <strong>{popupText.title}</strong>
          </div>
          <div className="popup-content-ref">
            <p>{popupText.fecha}</p>
          </div>
          <div className="popup-content-fecha">
            <p>{popupText.referencia}</p>
          </div>
          <div className="popup-content">
            <p>{popupText.text}</p>
            <div className="popup-images">
              {popupText.images.map((image, index) => (
                <a
                  key={index}
                  href={image}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={image} alt={`Image ${index}`} />
                </a>
              ))}
            </div>
          </div>
        </div>
      );

      const marker = L.marker([lat, lng], { icon: icon })
        .addTo(Icons[group])
        .bindPopup(ReactDOMServer.renderToStaticMarkup(popupContent))
        .on("mouseover", function (e) {
          this.bindTooltip(popupText.title, {
            permanent: true,
            direction: "top",
            offset: [-12, -23],
          }).openTooltip();
          this._tooltip._container.classList.add("custom-tooltip");
        })
        .on("mouseout", function (e) {
          this.unbindTooltip();
        });

      markersObject[popupText.title] = {
        marker: marker,
        group: group,
        iconNum: iconNum,
      };
    };

    const map = L.map(mapRef.current, {
      crs: CUSTOM_CRS,
      minZoom: 1,
      maxZoom: 5,
      Zoom: 5,
      maxNativeZoom: 5,
      preferCanvas: true,
      layers: [AtlasStyle], // Comienza con AtlasStyle
      center: [0, 0],
      zoom: 3,
    });

    for (const group in Icons) {
      Icons[group].addTo(map);
    }

    const addMarker = (e) => {
      const latlng = e.latlng;
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null; // Reiniciamos la referencia
      } else {
        const icon = L.icon({
          iconUrl: `ImgMapInteractive/blips/1.webp`,
          iconSize: [27, 32],
          iconAnchor: [13, 35],
          popupAnchor: [0, -37],
        });
        const marker = L.marker(latlng, { icon: icon }).addTo(map);
        markerRef.current = marker;
        marker
          .bindPopup(
            `Coordenadas: ${latlng.lat.toFixed(2)}, ${latlng.lng.toFixed(2)}`
          )
          .openPopup();
      }
    };
    map.on("click", addMarker);

    map.zoomControl.remove();

    const layersControl = L.control
      .layers(
        {
          "Estilo Atlas": AtlasStyle,
          "Estilo Satélite": SateliteStyle,
        },
        Icons,
        { position: "bottomleft", collapsed: false }
      )
      .addTo(map);

    layersControl._container.classList.add("layers-expanded");

    map.on("baselayerchange", function (e) {
      setSelectedMap(e.name);
    });

    map.on("overlayadd", function (e) {
      setActiveGroup(e.layer.options.name);
    });

    map.on("overlayremove", function (e) {
      setActiveGroup(null);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Cambia el color del mapa dependiendo del mapa seleccionado
  useEffect(() => {
    const mapContainer = mapRef.current;
    if (mapContainer) {
      if (selectedMap === "Estilo Atlas") {
        mapContainer.style.backgroundColor = "#0FA8D2";
      } else if (selectedMap === "Estilo Satélite") {
        mapContainer.style.backgroundColor = "#153E69";
      }
    }
  }, [selectedMap]);

  const activatePopup = (title) => {
    const marker = markers[title].marker;
    marker.openPopup();
  };

  const toggleMenu = () => {
    setMenuDesplegado(!menuDesplegado);
  };

  return (
    <div>
      <div id="map" ref={mapRef} className="map-container" />
      <div className="DisclaimerKami">
        <p>
          By LorKami{" "}
          <MdGppGood
            style={{ verticalAlign: "top", color: "green" }}
            size="1.15rem"
          />
        </p>
      </div>
      <div className="DisclaimerPagina">
        <div className="DisclaimerPaginaNav">
          <div className="DiscialmerPaginaNavTexto">
            <p>San Andreas Fire Marshall - Mapa de riesgos</p>
          </div>
          <div className="DiscialmerPaginaNavImagen">
            <img src={LogoSAFDfiremarshal} alt="SAFD Marshall VibesRP" />
          </div>
        </div>
      </div>

      <div className="MenuContainer">
        <div className={`MenuDesplegable ${menuDesplegado ? "visible" : ""}`}>
          <ul>
            {Object.keys(Icons).map((group) => (
              <li key={group}>
                <strong className="GroupTitle">
                  <div className="SpanControl">
                    <span className="marker-icon">
                      <img
                        src={`${process.env.PUBLIC_URL}/ImgMapInteractive/blips/${group}.webp`}
                        alt="Category Icon"
                        width="22"
                        height="25"
                      />
                    </span>
                    <div className="GroupInfo">
                      <span>{group}</span>
                      <span
                        className="ArrowIcon"
                        onClick={() =>
                          setMenuDesplegado((prevMenuDesplegado) => ({
                            ...prevMenuDesplegado,
                            [group]: !prevMenuDesplegado[group],
                          }))
                        }
                      >
                        {menuDesplegado[group] ? (
                          <FaArrowAltCircleUp
                            style={{ verticalAlign: "middle" }}
                            size="0.9rem"
                          />
                        ) : (
                          <FaArrowAltCircleRight
                            style={{ verticalAlign: "middle" }}
                            size="0.9rem"
                          />
                        )}
                      </span>
                    </div>
                  </div>
                </strong>
                {menuDesplegado[group] && (
                  <ul className="ListaControl">
                    {Object.keys(markers)
                      .filter((title) => markers[title].group === group)
                      .map((title, index) => (
                        <li
                          key={index}
                          onClick={() => activatePopup(title)}
                          className={activeGroup === group ? "active" : ""}
                        >
                          <div className="SpanControl">
                            <span className="marker-icon">
                              <img
                                src={`${process.env.PUBLIC_URL}/ImgMapInteractive/blips/${markers[title].iconNum}.webp`}
                                alt="Marker Icon"
                                width="20"
                                height="25"
                              />
                            </span>
                            <span className="marker-title">{title}</span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div
          className={`MenuToggle ${menuDesplegado ? "visible" : ""}`}
          onClick={toggleMenu}
        >
          <Hamburger />
        </div>
      </div>
    </div>
  );
};

export default MapaInteractivo;
