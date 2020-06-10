# -*- coding: utf-8 -*-
import pip
import pip._internal
import requests
from os.path import expanduser, join, isfile, exists
import os
import subprocess
import json
import struct
from sys import version_info, executable
from itertools import product
import pyprind
import js2py
from bs4 import BeautifulSoup
import re
import ssl
from pySmartDL import SmartDL
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from urllib3.util.ssl_ import create_urllib3_context
import logging

try:
    unicode
except NameError:
    unicode = str

logger = logging.getLogger(__name__)

# Python 2.X 3.X input
try:
    input = raw_input
except NameError:
    pass

MAIN_URL = "http://www.lfd.uci.edu/~gohlke/pythonlibs/"

# Added header for postman client
HEADER = {
    "User-Agent": "PostmanRuntime/7.22.0",
    "Accept": "*/*",
    "Cache-Control": "no-cache",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.lfd.uci.edu/~gohlke/pythonlibs",
    "Connection": "keep-alive",
}


class DESAdapter(HTTPAdapter):
    """
    Workaround to prevent https errors with newer versions of the requests package.

    Forces all HTTPS connections to be negotiated using a limited set of legacy
    TLS ciphers which are supported by the UCI LFD server. A short list of ciphers is
    used so that the handshake message does not exceed 255 bytes - see
    https://github.com/ssllabs/research/wiki/Long-Handshake-Intolerance

    If the UCI LFD server is ever upgraded, this code should be removed as the resulting
    connection is potentially vulnerable to attack!
    """

    CIPHERS = "RSA+3DES:ECDH+3DES:DH+3DES"

    def init_poolmanager(self, connections, maxsize, block=False, *args, **kwargs):
        context = create_urllib3_context(ciphers=DESAdapter.CIPHERS)
        kwargs["ssl_context"] = context
        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_version=ssl.PROTOCOL_SSLv23,
            *args,
            **kwargs
        )


def build_cache():
    """
    Get current data from the website http://www.lfd.uci.edu/~gohlke/pythonlibs/

    Returns
    -------
    Dictionary containing package details
    """
    data = {}
    response = requests.request("GET", MAIN_URL, headers=HEADER)

    soup = BeautifulSoup(response.text, features="html.parser")

    # We mock out a little javascript environment within which to run Gohlke's obfuscation code
    context = js2py.EvalJs()
    context.execute(
        """
    top = {location: {href: ''}};
    location = {href: ''};
    function setTimeout(f, t) {
        f();
    };
    """
    )

    # We grab Gohlke's code and evaluate it within py2js
    dl_function = re.search(r"function dl.*\}", soup.find("script").string).group(0)
    context.execute(dl_function)

    links = soup.find(class_="pylibs").find_all("a")
    for link in links:
        if link.get("onclick") is not None:
            # Evaluate the obfuscation javascript, store the result (squirreled away within location.href) into url
            regex_result = re.search(r"dl\(.*\)", link.get("onclick"))
            if regex_result is None:
                logger.info(u"Skip %s (wrong link format)" % unicode(link.string))
                continue
            context.execute(regex_result.group(0))
            url = context.location.href

            # Details = [package, version, pyversion, --, arch]
            details = url.split("/")[-1].split("-")
            pkg = details[0].lower().replace("_", "-")

            # Not using EXEs and ZIPs
            if len(details) != 5:
                logger.info(u"Skip %s (wrong name format)" % unicode(link.string))
                continue
            else:
                logger.debug(u"Add %s" % unicode(link.string))
            # arch = win32 / win_amd64 / any
            arch = details[4]
            arch = arch.split(".")[0]
            # ver = cpXX / pyX / pyXXx
            pkg_ver = details[1]
            py_ver = details[2]

            py_ver_key = py_ver + "-" + arch
            # print({py_ver_key: {pkg_ver: url}})
            if pkg in data.keys():
                if py_ver_key in data[pkg].keys():
                    data[pkg][py_ver_key].update({pkg_ver: url})
                else:
                    data[pkg][py_ver_key] = {pkg_ver: url}
            else:
                data[pkg] = {py_ver_key: {pkg_ver: url}}
        else:
            if link.string:
                logger.debug(u"Skip %s (missing link)" % unicode(link.string))
    return data


def filter_packages(data):
    """
    Filter packages based on your current system
    """

    sys_data = {}

    # Check lists
    verlist = []
    archlist = []
    ver = version_info[:2]
    verlist.append("cp" + str(ver[0]) + str(ver[1]))
    verlist.append("py" + str(ver[0]))
    verlist.append("py" + str(ver[0]) + str(ver[1]))
    verlist.append("py2.py3")

    archlist.append("any")
    if (struct.calcsize("P") * 8) == 32:
        archlist.append("win32")
    elif (struct.calcsize("P") * 8) == 64:
        archlist.append("win_amd64")

    checklist = list(map("-".join, list(product(verlist, archlist))))

    for key in data.keys():
        presence = list(map(lambda x: x in data[key].keys(), checklist))
        try:
            id = presence.index(True)
        except ValueError:
            # Version not found
            continue
        sys_data[key] = data[key][checklist[id]]

    return sys_data


class PipwinCache(object):
    """
    Pipwin cache class
    """

    def __init__(self, refresh=False):
        """
        Search if cache file is there in HOME.
        If not, build one.

        Parameters
        ----------
        refresh: boolean
            If True, rebuilds the cache.
        """

        home_dir = expanduser("~")
        self.cache_file = join(home_dir, ".pipwin")

        if isfile(self.cache_file) and not refresh:
            with open(self.cache_file) as fp:
                cache_dump = fp.read()
            self.data = json.loads(cache_dump)
        else:
            print("Building cache. Hang on . . .")
            self.data = build_cache()

            with open(self.cache_file, "w") as fp:
                fp.write(
                    json.dumps(
                        self.data, sort_keys=True, indent=4, separators=(",", ": ")
                    )
                )

            print("Done")

        if not refresh:
            # Create a package list for the system
            self.sys_data = filter_packages(self.data)

    def print_list(self):
        """
        Print the list of packages available for system
        """

        print("# Listing packages available for your system\n")
        for package in self.sys_data.keys():
            print(package)
        print("")

    def search(self, requirement):
        """
        Search for a package

        Returns
        -------
        exact_match : boolean
            True if exact match is found
        matches : list
            List of matches. Is a string if exact_match is True.
        """

        if requirement.name in self.sys_data.keys():
            return [True, requirement.name]

        # find all packages that contain our search term within them
        found = [pack for pack in self.sys_data.keys() if requirement.name in pack]
        return [False, found]

    def _get_url(self, requirement):
        versions = list(
            requirement.specifier.filter(self.sys_data[requirement.name].keys())
        )
        if not versions:
            raise ValueError("Could not satisfy requirement %s" % (str(requirement)))
        return self.sys_data[requirement.name][max(versions)]

    def _get_pipwin_dir(self):
        home_dir = expanduser("~")
        pipwin_dir = join(home_dir, "pipwin")
        if not exists(pipwin_dir):
            os.makedirs(pipwin_dir)
        return pipwin_dir

    def _download(self, requirement, dest):
        url = self._get_url(requirement)
        wheel_name = url.split("/")[-1]
        print("Downloading package . . .")
        print(url)
        print(wheel_name)

        if dest is not None:
            # Ensure the download directory
            if not exists(dest):
                os.makedirs(dest)
        else:
            dest = self._get_pipwin_dir()

        wheel_file = join(dest, wheel_name)

        if exists(wheel_file):
            print("File " + wheel_file + " already exists")
            return wheel_file

        obj = SmartDL(url, dest)
        obj.start()
        return wheel_file

    def download(self, requirement, dest=None):
        return self._download(requirement, dest)

    def install(self, requirement):
        """
        Install a package
        """
        wheel_file = self.download(requirement)
        subprocess.check_call([executable, "-m", "pip", "install", wheel_file])
        os.remove(wheel_file)

    def uninstall(self, requirement):
        """
        Uninstall a package
        """
        subprocess.check_call([executable, "-m", "pip", "uninstall", requirement.name])


def refresh():
    """
    Rebuild the cache
    """

    PipwinCache(refresh=True)


if __name__ == "__main__":
    refresh()
