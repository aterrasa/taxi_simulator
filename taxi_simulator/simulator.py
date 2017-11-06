# -*- coding: utf-8 -*-

"""Main module."""
import json
import faker
import logging

from spade.ACLMessage import ACLMessage
from spade.Agent import Agent
from spade.Behaviour import Behaviour, ACLTemplate, MessageTemplate

from taxi import TaxiAgent
from utils import random_position, simulator_aid, CREATE_PROTOCOL

logger = logging.getLogger("SimulatorAgent")


class SimulatorAgent(Agent):
    def __init__(self, agentjid, password, debug):
        self.taxi_agents = {}
        self.passenger_agents = {}

        self.faker = faker.Factory.create()

        Agent.__init__(self, agentjid=agentjid, password=password, debug=debug)

    def _setup(self):
        logger.info("Simulator agent running")
        self.wui.setPort(9000)
        self.wui.start()
        logger.info("Web interface running at http://localhost:{}".format(self.wui.port))

        self.wui.setTemplatePath("taxi_simulator/templates")

        tpl = ACLTemplate()
        tpl.setProtocol(CREATE_PROTOCOL)
        template = MessageTemplate(tpl)
        self.addBehaviour(CreateAgent(), template)

        self.wui.registerController("app", self.index_controller)
        self.wui.registerController("entities", self.entities_controller)
        self.wui.registerController("generate", self.generate_controller)

    def index_controller(self):
        return "index.html", {}

    def entities_controller(self):
        result = {
            "taxis": [taxi.to_json() for taxi in self.taxi_agents.values()],
            "passengers": [passenger.to_json() for passenger in self.passenger_agents.values()],
        }
        return None, result

    def generate_controller(self):
        logger.info("Creating taxis.")
        for _ in range(10):
            self.create_taxi()
        return None, {"status": "done"}

    def stop_agents(self):
        for name, agent in self.taxi_agents.items():
            logger.info("Stopping taxi {}".format(name))
            agent.stop()
        del self.taxi_agents
        for name, agent in self.passenger_agents.items():
            logger.info("Stopping passenger {}".format(name))
            agent.stop()
        del self.passenger_agents

    def create_taxi(self, position=None):
        position = random_position() if not position else position
        taxi_id = self.faker.user_name()
        password = self.faker.password()
        msg = ACLMessage()
        msg.addReceiver(simulator_aid)
        msg.setProtocol(CREATE_PROTOCOL)
        content = {
            "type": "taxi",
            "id": taxi_id,
            "password": password,
            "position": position
        }
        msg.setContent(json.dumps(content))
        self.send(msg)


class CreateAgent(Behaviour):
    def _process(self):
        msg = self._receive(block=True)
        content = json.loads(msg.content)
        type_ = content["type"]
        name = content["id"]
        passwd = content["password"]
        position = content["position"]
        jid = name + "@127.0.0.1"
        if type_ == "taxi":
            taxi = TaxiAgent(jid, passwd, debug=[])
            taxi.set_id(name)
            taxi.set_position(position)
            self.myAgent.taxi_agents[jid] = taxi
            taxi.start()
            logger.info("Created taxi {} at position {}".format(name, position))