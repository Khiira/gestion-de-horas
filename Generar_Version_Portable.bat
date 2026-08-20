@echo off
echo ========================================================
echo   GENERANDO VERSION PORTABLE DE GESTION DE HORAS PRO
echo ========================================================
echo Compilando aplicacion para Windows con icono personalizado...
python -m PyInstaller --noconfirm --onedir --windowed --add-data "templates;templates" --add-data "static;static" --icon="icono.ico" --name "Gestion_de_Horas_Portable" app.py
echo.
echo Copiando scripts de inicio automatico, instrucciones y extensiones web...
copy /Y "Activar_Inicio_Automatico.vbs" "dist\Gestion_de_Horas_Portable\" >nul
copy /Y "Desactivar_Inicio_Automatico.vbs" "dist\Gestion_de_Horas_Portable\" >nul
copy /Y "LEEME_COMO_USAR.txt" "dist\Gestion_de_Horas_Portable\" >nul
xcopy /E /I /Y "Extension_Navegador" "dist\Gestion_de_Horas_Portable\Extension_Navegador" >nul
xcopy /E /I /Y "Extension_Firefox" "dist\Gestion_de_Horas_Portable\Extension_Firefox" >nul
echo.
echo ========================================================
echo !LISTO! La carpeta portable esta dentro de la carpeta: dist\Gestion_de_Horas_Portable
echo Puedes comprimir (zip) la carpeta dist\Gestion_de_Horas_Portable y enviarla a tus companeros.
echo ========================================================
