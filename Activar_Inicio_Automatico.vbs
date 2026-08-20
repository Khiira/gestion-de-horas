Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Obtener la carpeta actual donde está el script
strCurrentDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strExePath = objFSO.BuildPath(strCurrentDir, "Gestion_de_Horas_Portable.exe")

If Not objFSO.FileExists(strExePath) Then
    MsgBox "No se encontró el archivo Gestion_de_Horas_Portable.exe en esta carpeta.", 48, "Error"
    WScript.Quit
End If

' Obtener la carpeta de Inicio automático de Windows del usuario (cero permisos de administrador)
strStartupFolder = WshShell.SpecialFolders("Startup")
strShortcutPath = objFSO.BuildPath(strStartupFolder, "Gestion de Horas Pro.lnk")

Set oShellLink = WshShell.CreateShortcut(strShortcutPath)
oShellLink.TargetPath = strExePath
oShellLink.WorkingDirectory = strCurrentDir
oShellLink.IconLocation = strExePath & ", 0"
oShellLink.Description = "Sistema de Gestión de Horas Pro - Inicio Automático"
oShellLink.Save

MsgBox "¡Configuración exitosa!" & vbCrLf & vbCrLf & "A partir de ahora, el Sistema de Gestión de Horas (con su nuevo icono y alertas) se iniciará automáticamente cada vez que enciendas tu computadora.", 64, "Inicio Automático Activado"
