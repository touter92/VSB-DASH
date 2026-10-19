@echo off
title Tableau de Bord VSB - Demarrage & Serveur API
echo ========================================================
echo      TABLEAU DE BORD VSB - VILLES SANS BIDONVILLES
echo      SERVEUR LOCAL API, AZURE SQL & SHAREPOINT
echo ========================================================
echo.
echo Lancement du serveur local sur le port 8080...
start "Serveur VSB Monitor" /B python "%~dp0server.py"

timeout /t 2 /nobreak >nul
echo.
echo Ouverture du Tableau de Bord dans votre navigateur...
start "" "http://localhost:8080"

echo.
echo Serveur actif sur http://localhost:8080
echo Vous pouvez fermer cette fenetre ou appuyer sur une touche pour quitter.
echo.
pause
